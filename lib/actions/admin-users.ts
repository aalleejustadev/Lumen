"use server"

import { randomBytes } from "node:crypto"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth, getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { countryCodes } from "@/lib/config/countries"
import { INVITATION_TTL_DAYS, newUserRoles } from "@/lib/config/admin-users"
import type { UserPlan } from "@/lib/admin/users"
import type { UserStatus } from "@/lib/generated/prisma/client"

/**
 * Writes behind `/dashboard/admin/users` and `/dashboard/admin/users/new`.
 * Reads live in `lib/admin/users.ts`.
 *
 * **Every one of these re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these actions suspend accounts and create new ones — the two things nobody
 * but an admin may do. `lib/actions/admin-audit.ts` makes the same point about
 * a read.
 *
 * They return `{ ok, message }` for the caller to toast rather than throwing,
 * the shape `lib/actions/cart.ts` established.
 */

export type AdminUsersResult = { ok: boolean; message: string }

const DENIED: AdminUsersResult = {
  ok: false,
  message: "You do not have access to the user console.",
}

/** The admin's own session, or `null` when they are not one. */
async function requireAdmin() {
  const session = await getSession()
  if (session?.user.role !== "admin") return null
  return session
}

/**
 * `revalidatePath("/dashboard/admin/users")` on its own would miss two things:
 * the sidebar's counts live in the console layout, and every filtered view of
 * this table is a different URL. Revalidating the **layout** re-renders the
 * whole console subtree, so whichever filter the admin is looking at picks the
 * change up — the mechanism `lib/actions/wishlist.ts` documents for the
 * sidebar badge.
 */
function revalidateConsole() {
  revalidatePath("/dashboard/admin", "layout")
}

// ---------------------------------------------------------------------------
// Suspend / reactivate
// ---------------------------------------------------------------------------

/**
 * The row menu's Suspend and the bulk bar's two buttons, which are the same
 * operation over one id or several.
 *
 * `User.status` and Better Auth's `banned` are written **together**: the enum
 * is what this console's Status column renders and what its filters query,
 * while `banned` is what the `admin` plugin's own session checks read. Setting
 * only one of them would give the table and the sign-in path different ideas
 * about the same account.
 *
 * Two accounts are refused, both for the same reason — an admin should not be
 * able to lock the console:
 *
 *  - **yourself**, which would sign you out of the page you are standing on;
 *  - **the last active admin**, which would leave the platform with nobody who
 *    could undo it.
 *
 * The ids are not trusted: they came from the browser, so the accounts are
 * re-read here and the audit entries are written from what the database says
 * rather than from anything the caller sent.
 */
export async function setUserStatus(
  userIds: string[],
  status: Extract<UserStatus, "ACTIVE" | "SUSPENDED">
): Promise<AdminUsersResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const ids = [...new Set(userIds.filter((id) => typeof id === "string"))]
  if (ids.length === 0) {
    return { ok: false, message: "No accounts were selected." }
  }

  if (status === "SUSPENDED" && ids.includes(session.user.id)) {
    return { ok: false, message: "You cannot suspend your own account." }
  }

  const targets = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  if (targets.length === 0) {
    return { ok: false, message: "Those accounts no longer exist." }
  }

  if (status === "SUSPENDED") {
    const admins = targets.filter((target) => target.role === "admin")
    if (admins.length > 0) {
      const remaining = await db.user.count({
        where: {
          role: "admin",
          status: { not: "SUSPENDED" },
          id: { notIn: admins.map((admin) => admin.id) },
        },
      })
      if (remaining === 0) {
        return {
          ok: false,
          message:
            "That would leave the platform with no active admin. Promote someone else first.",
        }
      }
    }
  }

  const suspending = status === "SUSPENDED"

  await db.$transaction([
    db.user.updateMany({
      where: { id: { in: targets.map((target) => target.id) } },
      data: {
        status,
        banned: suspending,
        banReason: suspending ? "Suspended from the admin console" : null,
        // Cleared either way: a reactivated account must not keep an expiry
        // that would silently re-ban it, and a fresh suspension is indefinite
        // until somebody lifts it.
        banExpires: null,
      },
    }),
    db.auditLog.createMany({
      data: targets.map((target) => ({
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: suspending ? "Suspended an account" : "Reactivated an account",
        targetType: "user",
        targetId: target.id,
        targetLabel: target.email,
        // SECURITY rather than MEMBERS: this is access being taken away or
        // given back, which is what someone filters that tab to find.
        category: "SECURITY" as const,
      })),
    }),
  ])

  revalidateConsole()

  const noun =
    targets.length === 1 ? targets[0]!.name : `${targets.length} accounts`
  return {
    ok: true,
    message: suspending ? `${noun} suspended` : `${noun} reactivated`,
  }
}

// ---------------------------------------------------------------------------
// Add new user
// ---------------------------------------------------------------------------

export type NewUserInput = {
  name: string
  email: string
  country: string
  plan: UserPlan
  role: "user" | "instructor" | "admin"
  sendEmail: boolean
}

const roleValues = new Set(newUserRoles.map((role) => role.value))

/**
 * "Create user" on `/dashboard/admin/users/new`.
 *
 * It writes **both** rows, and the pair is the point:
 *
 *  - a `User` with `status = PENDING`, so the account the admin just made
 *    shows up in the table straight away. That is exactly what the enum value
 *    means — `UserStatus`'s own note calls it "invited, never signed in".
 *  - a `UserInvitation` recording what was sent, to whom, by whom, and whether
 *    an email went out. `sendEmail` is stored rather than being a transient
 *    form field for the reason that model gives: an account created silently
 *    has no token anybody has seen, and the row is the only record of that.
 *
 * The account goes through **`auth.api.createUser`**, not `db.user.create`:
 * Better Auth owns the `user` table and the credential account beside it, and
 * a row inserted around it would be an account nobody could ever sign in to.
 * The password is random and is never shown to anyone — it exists only so the
 * credential account exists, and the invitee replaces it through the
 * password-reset flow, which is already built and already works.
 * `requestPasswordReset` is what sends that link; `lib/auth.ts` notices the
 * pending invitation and sends the invitation wording rather than the ordinary
 * "reset your password" copy.
 *
 * **The token is not consumed by anything yet.** There is no `/invite/[token]`
 * route and no export for one, so the invitation is redeemed implicitly — the
 * person sets a password and signs in. `acceptedUserId` and `expiresAt` are
 * what a real redemption route will use when it lands; until then the
 * invitation is a record, and the working link is the reset one.
 */
export async function createUser(
  input: NewUserInput
): Promise<AdminUsersResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const name = input.name?.trim() ?? ""
  const email = input.email?.trim().toLowerCase() ?? ""
  const country = input.country?.trim().toUpperCase() ?? ""

  if (name.length < 2) {
    return { ok: false, message: "Enter the person's full name." }
  }
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." }
  }
  if (!countryCodes.includes(country)) {
    return { ok: false, message: "Choose a country from the list." }
  }
  if (!roleValues.has(input.role)) {
    return { ok: false, message: "Choose a role." }
  }
  const plan: UserPlan = input.plan === "business" ? "business" : "free"

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) {
    return { ok: false, message: "An account already uses that address." }
  }

  let created: { id: string }
  try {
    const result = await auth.api.createUser({
      headers: await headers(),
      body: {
        email,
        name,
        // Always "user" here, even for an instructor or an admin. The plugin
        // types `role` as its own two built-ins, and widening that means
        // configuring `admin({ roles })` with a full access-control model the
        // app does not otherwise have. The column is a plain string — the seed
        // writes "instructor" into it directly — so the real role is set in
        // the update below, after this caller has already been checked.
        role: "user",
        // Never shown, never sent. See the note above.
        password: randomBytes(32).toString("base64url"),
      },
    })
    created = result.user
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "That account could not be created.",
    }
  }

  // `country` and `status` are not Better Auth `additionalFields` — the same
  // call the settings pages make, and for the same reason: a field in that
  // list can be PATCHed straight through `/api/auth/update-user`, and neither
  // of these is the account holder's to set.
  await db.user.update({
    where: { id: created.id },
    data: { country, status: "PENDING", role: input.role },
  })

  await db.userInvitation.create({
    data: {
      email,
      name,
      role: input.role,
      country,
      // Null means Free — `UserInvitation.plan`'s own note. A Business
      // invitation records the intent; the subscription itself is Stripe's and
      // starts when they pay.
      plan: plan === "business" ? "business" : null,
      token: randomBytes(32).toString("base64url"),
      sendEmail: input.sendEmail,
      expiresAt: new Date(
        Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
      invitedById: session.user.id,
    },
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action: input.sendEmail
        ? "Invited a new member"
        : "Created an account silently",
      targetType: "user",
      targetId: created.id,
      targetLabel: email,
      category: "MEMBERS",
    },
  })

  if (input.sendEmail) {
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: "/reset-password" },
      })
    } catch {
      // The account exists either way, so a mail failure must not read as a
      // failed create — it is a thing to retry, not to undo.
      revalidateConsole()
      return {
        ok: true,
        message: `${name} was added, but the invitation email could not be sent.`,
      }
    }
  }

  revalidateConsole()
  return {
    ok: true,
    message: input.sendEmail
      ? `${name} was invited — they will get an email to set a password.`
      : `${name} was added without an invitation email.`,
  }
}
