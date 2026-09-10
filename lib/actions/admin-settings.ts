"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth, getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { PLATFORM_SETTING_ID } from "@/lib/admin/settings"
import {
  BRANDING_MAX_BYTES,
  BRANDING_MIME_TYPES,
  META_DESCRIPTION_MAX,
  platformCurrencyValues,
  platformToggleNames,
  PLATFORM_ACCENTS,
  revenueShareValues,
  SUPPORT_EMAIL_MAX,
  WEBSITE_TITLE_MAX,
  type BrandingAssetKind,
} from "@/lib/config/admin-settings"
import { emailChangeMessage, requestEmailChange } from "@/lib/email-change"
import { MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from "@/lib/config/settings"
import { deleteBrandingAsset, putBrandingAsset } from "@/lib/storage"
import type { PlatformSetting } from "@/lib/generated/prisma/client"

/**
 * The writes behind `/dashboard/admin/settings/*`. Reads live in
 * `lib/admin/settings.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these set the name of the site, who may sign up for it, and whether it is
 * serving at all. They return `{ ok, message }` for the caller to toast
 * rather than throwing, the shape `lib/actions/cart.ts` established.
 *
 * The platform writes log under **SECURITY**, not BILLING. `AuditCategory`
 * has no SETTINGS member, and of the four it has, SECURITY is the one an
 * incident review actually opens: closing signups, dropping the manual review
 * gate and turning on maintenance mode are all changes to who can reach what.
 * (The revenue share and currency are arguably billing, but splitting one
 * form across two audit tabs would make a single save impossible to read back
 * as one act.) The **profile** write is the exception and logs nothing at
 * all: an admin editing their own display name is not an administrative act
 * on anybody else, and `lib/actions/profile.ts` does not log the learner
 * equivalent either.
 */

export type AdminSettingsResult = {
  ok: boolean
  message: string
  /** Set when the Email field itself was refused, so the form can mark it. */
  emailError?: string
}

const DENIED: AdminSettingsResult = {
  ok: false,
  message: "You do not have access to platform settings.",
}

async function requireAdmin() {
  const session = await getSession()
  if (session?.user.role !== "admin") return null
  return session
}

async function log(
  session: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  action: string,
  targetLabel: string
) {
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action,
      targetType: "platform_setting",
      targetId: PLATFORM_SETTING_ID,
      targetLabel,
      category: "SECURITY",
    },
  })
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * The admin profile card's only editable field.
 *
 * `name` goes through **`auth.api.updateUser`**, not `db.user.update`, for the
 * reason `CLAUDE.md` records: it is a core Better Auth field that the sidebar,
 * the app bar and the account menu render from the *session*, which has a
 * five-minute cookie cache — a bare column write would leave the old name in
 * the console chrome for up to five minutes.
 *
 * **Email is writable**, through the shared `requestEmailChange`. The export
 * draws it disabled and points at an email-settings page that does not exist,
 * so it is a real field now. It is still not a column write: Better Auth owns
 * the address and sends a confirmation to the one on the account today, so
 * the usual outcome is "pending" rather than "changed" — the toast says
 * which. The learner's `updateProfile` calls the identical helper.
 */
export async function updateAdminProfile(
  formData: FormData
): Promise<AdminSettingsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH)
  if (name.length === 0) {
    return { ok: false, message: "Enter your full name." }
  }

  // Attempted before the name write so a refused address fails the whole
  // save rather than leaving the name written and the email silently
  // dropped — the ordering `updateProfile` uses for the same pair.
  const emailOutcome = await requestEmailChange(
    session.user.id,
    session.user.email,
    String(formData.get("email") ?? "").slice(0, MAX_EMAIL_LENGTH)
  )
  if (emailOutcome.status === "error") {
    return {
      ok: false,
      message: "Check the highlighted field and try again.",
      emailError: emailOutcome.message,
    }
  }

  if (name !== session.user.name) {
    await auth.api.updateUser({ body: { name }, headers: await headers() })
  }

  // The whole console shell renders the name, so the layout re-renders — the
  // same reason `uploadAvatar` revalidates the layout rather than its page.
  revalidatePath("/dashboard", "layout")
  return {
    ok: true,
    message: ["Profile updated.", emailChangeMessage(emailOutcome)]
      .filter(Boolean)
      .join(" "),
  }
}

// ---------------------------------------------------------------------------
// Platform Controls
// ---------------------------------------------------------------------------

/**
 * One save from the Platform Controls form.
 *
 * **It is a patch, not a whole form.** The export draws no submit button
 * anywhere on that page — it says "Changes save automatically" instead — so
 * each control saves itself as it is used, and a payload carries only the key
 * that changed. Accepting the whole row instead would mean every switch
 * rewriting all thirteen columns, so two admins with the page open would
 * silently undo each other's unrelated changes.
 *
 * Nothing here trusts what it is handed: every key is checked against the
 * configured list for its group and every value against the shape that group
 * allows, so an unknown key is refused rather than reaching Prisma.
 */
export type PlatformSettingsPatch = {
  accentColor?: string
  websiteTitle?: string
  metaDescription?: string
  supportEmail?: string
  currency?: string
  defaultRevenueShareBps?: number
  /** Any of `platformToggles`' four names, plus `maintenanceMode`. */
  toggle?: { name: string; value: boolean }
}

/** What the audit entry calls the change, per field. */
const FIELD_LABELS: Record<string, string> = {
  accentColor: "accent colour",
  websiteTitle: "website title",
  metaDescription: "meta description",
  supportEmail: "support email",
  currency: "platform currency",
  defaultRevenueShareBps: "default instructor revenue share",
}

export async function updatePlatformSettings(
  patch: PlatformSettingsPatch
): Promise<AdminSettingsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  // Plain scalars rather than `Prisma.PlatformSettingUpdateInput`: that type
  // admits `{ set: … }` operation objects, which the `create` half of the
  // upsert below will not accept. A partial of the row itself is assignable
  // to both.
  const data: Partial<Omit<PlatformSetting, "id" | "updatedAt">> = {}
  const changed: string[] = []

  if (patch?.accentColor !== undefined) {
    if (!(PLATFORM_ACCENTS as readonly string[]).includes(patch.accentColor)) {
      return { ok: false, message: "That isn't one of the accent colours." }
    }
    data.accentColor = patch.accentColor
    changed.push(FIELD_LABELS.accentColor)
  }

  if (patch?.websiteTitle !== undefined) {
    const title = String(patch.websiteTitle).trim().slice(0, WEBSITE_TITLE_MAX)
    if (title.length === 0) {
      return { ok: false, message: "The website title can't be empty." }
    }
    data.websiteTitle = title
    changed.push(FIELD_LABELS.websiteTitle)
  }

  if (patch?.metaDescription !== undefined) {
    const meta = String(patch.metaDescription)
      .trim()
      .slice(0, META_DESCRIPTION_MAX)
    if (meta.length === 0) {
      return { ok: false, message: "The meta description can't be empty." }
    }
    data.metaDescription = meta
    changed.push(FIELD_LABELS.metaDescription)
  }

  if (patch?.supportEmail !== undefined) {
    const email = String(patch.supportEmail).trim().slice(0, SUPPORT_EMAIL_MAX)
    // Deliberately loose: the exhaustive grammar is not worth reproducing and
    // a false negative here blocks a legitimate address. This catches the
    // typo the field actually receives — a missing @ or domain.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: "Enter a valid support email address." }
    }
    data.supportEmail = email
    changed.push(FIELD_LABELS.supportEmail)
  }

  if (patch?.currency !== undefined) {
    if (!platformCurrencyValues.has(patch.currency)) {
      return { ok: false, message: "That isn't a supported currency." }
    }
    data.currency = patch.currency
    changed.push(FIELD_LABELS.currency)
  }

  if (patch?.defaultRevenueShareBps !== undefined) {
    const bps = Number(patch.defaultRevenueShareBps)
    if (!revenueShareValues.has(bps)) {
      return { ok: false, message: "That isn't a supported revenue share." }
    }
    data.defaultRevenueShareBps = bps
    changed.push(FIELD_LABELS.defaultRevenueShareBps)
  }

  if (patch?.toggle !== undefined) {
    const { name, value } = patch.toggle
    // `maintenanceMode` is allowed here alongside the four access switches:
    // it is a column on the same row and the same kind of write. What makes
    // it different is the confirmation the *form* puts in front of it, which
    // is a UI affordance rather than a guard — so nothing below treats it
    // specially except the sentence it is logged under.
    if (!platformToggleNames.has(name) && name !== "maintenanceMode") {
      return { ok: false, message: "That isn't a platform setting." }
    }
    ;(data as Record<string, unknown>)[name] = value === true
    changed.push(name === "maintenanceMode" ? "maintenance mode" : name)
  }

  if (changed.length === 0) {
    return { ok: false, message: "Nothing to save." }
  }

  await db.platformSetting.upsert({
    where: { id: PLATFORM_SETTING_ID },
    update: data,
    create: { id: PLATFORM_SETTING_ID, ...data },
  })

  await log(
    session,
    patch.toggle?.name === "maintenanceMode"
      ? patch.toggle.value
        ? "Turned on maintenance mode"
        : "Turned off maintenance mode"
      : "Changed platform settings",
    changed.join(", ")
  )

  // The console layout and every public page read these, so the whole tree is
  // invalidated rather than this one route.
  revalidatePath("/", "layout")
  return { ok: true, message: "Changes saved." }
}

/**
 * "Upload logo" / "Upload favicon".
 *
 * Applies immediately rather than waiting for a submit, which is what the
 * export's own layout implies (the buttons sit outside any form) and, on this
 * page, what the absence of a submit button *requires*. It is also what stops
 * an object being stored and then orphaned when the admin navigates away —
 * the reasoning `uploadAvatar` records.
 */
export async function uploadBrandingAsset(
  formData: FormData
): Promise<AdminSettingsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const kind = String(formData.get("kind") ?? "")
  if (kind !== "logo" && kind !== "favicon") {
    return { ok: false, message: "Pick a logo or a favicon to upload." }
  }
  const assetKind: BrandingAssetKind = kind

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image to upload." }
  }
  if (!BRANDING_MIME_TYPES.includes(file.type as never)) {
    return { ok: false, message: "Use a PNG, WebP, JPEG or ICO image." }
  }
  if (file.size > BRANDING_MAX_BYTES) {
    const mb = Math.round(BRANDING_MAX_BYTES / (1024 * 1024))
    return { ok: false, message: `Images must be under ${mb}MB.` }
  }

  const url = await putBrandingAsset(assetKind, {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  })
  if (!url) {
    return {
      ok: false,
      message: "Image uploads aren't configured for this environment yet.",
    }
  }

  const current = await db.platformSetting.findUnique({
    where: { id: PLATFORM_SETTING_ID },
    select: { logoUrl: true, faviconUrl: true },
  })
  const previous =
    assetKind === "logo"
      ? (current?.logoUrl ?? null)
      : (current?.faviconUrl ?? null)

  await db.platformSetting.upsert({
    where: { id: PLATFORM_SETTING_ID },
    update: assetKind === "logo" ? { logoUrl: url } : { faviconUrl: url },
    create:
      assetKind === "logo"
        ? { id: PLATFORM_SETTING_ID, logoUrl: url }
        : { id: PLATFORM_SETTING_ID, faviconUrl: url },
  })

  // Only ever collects an object under this kind's own prefix — see
  // `lib/storage.ts`.
  await deleteBrandingAsset(assetKind, previous)

  await log(
    session,
    assetKind === "logo" ? "Changed the platform logo" : "Changed the favicon",
    assetKind
  )
  revalidatePath("/", "layout")
  return {
    ok: true,
    message: assetKind === "logo" ? "Logo updated." : "Favicon updated.",
  }
}
