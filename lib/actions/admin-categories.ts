"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  categoryAccent,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
} from "@/lib/config/admin-categories"

/**
 * Create, edit and delete for `/dashboard/admin/categories`, from
 * `categories-page__admin.png` and `new-category__dialog_admin.png`. Reads
 * live in `lib/admin/categories.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these three reshape the taxonomy the whole catalog is filed under. They
 * return `{ ok, message }` for the caller to toast rather than throwing, the
 * shape `lib/actions/cart.ts` established.
 *
 * Nothing here trusts what it is handed. The name and description are trimmed
 * and capped, the accent is resolved through `categoryAccent` (an unknown
 * token falls back rather than being stored), and `showInNav` is coerced —
 * the same posture `lib/actions/admin-courses.ts` takes with its enum values.
 */

export type AdminCategoriesResult = { ok: boolean; message: string }

const DENIED: AdminCategoriesResult = {
  ok: false,
  message: "You do not have access to categories.",
}

const NOT_FOUND: AdminCategoriesResult = {
  ok: false,
  message: "That category could not be found.",
}

export type CategoryInput = {
  name: string
  description: string
  accentColor: string
  showInNav: boolean
}

type CleanInput = {
  name: string
  description: string | null
  accentColor: string
  showInNav: boolean
}

function clean(input: CategoryInput): CleanInput | null {
  const name = (input?.name ?? "").trim().slice(0, CATEGORY_NAME_MAX_LENGTH)
  if (name.length === 0) return null

  const description = (input?.description ?? "")
    .trim()
    .slice(0, CATEGORY_DESCRIPTION_MAX_LENGTH)

  return {
    name,
    // Empty means "not written yet", which is what the nullable column means —
    // storing "" would make an unanswered field look answered.
    description: description.length > 0 ? description : null,
    accentColor: categoryAccent(input?.accentColor),
    showInNav: input?.showInNav === true,
  }
}

/**
 * A name to a URL-safe key. `Category.slug` is unique, so a collision gets a
 * numeric suffix rather than failing the write — two categories may perfectly
 * reasonably be named the same thing at different points in a tree.
 *
 * A name with nothing URL-safe in it (say, one written entirely in a script
 * this strips) would slugify to "", so it falls back to "category" and lets
 * the suffix loop do the rest.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return slug.length > 0 ? slug : "category"
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)

  // One query for every slug already starting with the base, rather than a
  // findUnique per candidate in a loop.
  const taken = new Set(
    (
      await db.category.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((row) => row.slug)
  )

  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/** "New category" in the page header. */
export async function createCategory(
  input: CategoryInput
): Promise<AdminCategoriesResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  const values = clean(input)
  if (!values) {
    return { ok: false, message: "Give the category a name." }
  }

  const [slug, last] = await Promise.all([
    uniqueSlug(values.name),
    // New categories land at the end of the list rather than at the top: the
    // six the export draws are in a deliberate order, and a new one has no
    // claim on a position in it until somebody moves it.
    db.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ])

  const category = await db.category.create({
    data: { ...values, slug, order: (last?.order ?? -1) + 1 },
    select: { id: true, name: true },
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action: "Created a category",
      targetType: "category",
      targetId: category.id,
      targetLabel: category.name,
      // `AuditCategory` has no CONTENT member and a category is part of the
      // catalog, so COURSES is where it belongs. Adding a fifth enum value
      // would need a fifth tab on the audit log for one label's sake.
      category: "COURSES",
    },
  })

  revalidateCategories()

  return { ok: true, message: `${category.name} was created` }
}

/** "Edit category" in a row's `⋯` menu. */
export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<AdminCategoriesResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  if (typeof id !== "string" || id.length === 0) return NOT_FOUND

  const values = clean(input)
  if (!values) {
    return { ok: false, message: "Give the category a name." }
  }

  const existing = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!existing) return NOT_FOUND

  // **The slug is deliberately left alone on a rename.** It is the category's
  // stable key rather than a second spelling of its name — `categoryIcons` in
  // `lib/config/admin-overview.ts` looks a category's glyph up by it, and it
  // is what a future `/dashboard/courses?category=` link would carry — so
  // re-deriving it here would quietly repoint every one of those at nothing.
  const category = await db.category.update({
    where: { id },
    data: values,
    select: { id: true, name: true },
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action: "Updated a category",
      targetType: "category",
      targetId: category.id,
      targetLabel: category.name,
      category: "COURSES",
    },
  })

  revalidateCategories()

  return { ok: true, message: `${category.name} was updated` }
}

/** "Delete category" in a row's `⋯` menu, behind its own confirmation. */
export async function deleteCategory(
  id: string
): Promise<AdminCategoriesResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  if (typeof id !== "string" || id.length === 0) return NOT_FOUND

  const category = await db.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { courses: true, children: true } },
    },
  })
  if (!category) return NOT_FOUND

  // The `⋯` menu already draws Delete disabled in both of these cases, and
  // neither check here is redundant: a stale tab is enough to send the call
  // anyway, and two admins working the taxonomy at once is the ordinary case
  // rather than a hostile one. They are tested in this order so the sentence
  // the caller toasts is the same one the disabled menu item gives.
  //
  // Children are the case Postgres would *not* stop. `Category.parent` is
  // `onDelete: SetNull`, so it would happily promote each child to the top
  // level and quietly add rows to this page. Refusing is the honest answer.
  if (category._count.children > 0) {
    return {
      ok: false,
      message: `${category.name} has sub-categories rolling up into it — move or delete those first.`,
    }
  }

  // Courses, by contrast, Postgres enforces on its own: `Course.category` is
  // a required relation with no `onDelete`, which it reads as RESTRICT — the
  // seed's own note. Without this check the delete would come back as a
  // foreign-key error rather than a sentence somebody can act on. The count is
  // direct-only, which is exactly right *here*: a category with children has
  // already been turned away above, so by this line its own courses are all
  // the courses there are.
  if (category._count.courses > 0) {
    return {
      ok: false,
      message: `${category.name} still has courses filed under it — move them first.`,
    }
  }

  await db.$transaction([
    db.category.delete({ where: { id: category.id } }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: "Deleted a category",
        targetType: "category",
        // The row is gone, so the id is a record of what it was rather than a
        // pointer — which is exactly what `AuditLog`'s snapshot columns are
        // for, and why `targetId` is a plain string and not a relation.
        targetId: category.id,
        targetLabel: category.name,
        category: "COURSES",
      },
    }),
  ])

  revalidateCategories()

  return { ok: true, message: `${category.name} was deleted` }
}

/**
 * The **layout**, not the page. Nothing in the console chrome renders a
 * category count today, but the sidebar is rendered by
 * `app/(admin)/layout.tsx` and a page-only revalidate would leave anything
 * added there stale; the cart badge and the wishlist count use the same
 * mechanism for the same reason.
 */
function revalidateCategories() {
  revalidatePath("/dashboard/admin", "layout")
}
