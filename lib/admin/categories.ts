import { cache } from "react"

import { db } from "@/lib/db"

/**
 * The read behind `/dashboard/admin/categories`, from
 * `ui-design/light/dashboard/admin/categories-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — the copy, the accent classes and
 * the accent guard live in `lib/config/admin-categories.ts` for that reason.
 *
 * **Nothing on the page is demo data, and nothing else writes these rows.**
 * `Category` already carried every column the export needs (`accentColor`,
 * `showInNav`, `order`, the tree), and the categories are **owned by the
 * admin** — created through this page. The seed used to author its own six and
 * no longer does: it resolves the existing ones by slug and refuses to run if
 * one is missing (`resolveCategories` in `prisma/seed.ts`), because a category
 * it created was pinned by the courses it created alongside it and could never
 * be deleted from the console.
 *
 * Four things about this query decide what the page *means*:
 *
 *  - **Only top-level categories are listed** (`parentId: null`), which is
 *    exactly the six the export draws. Nothing is nested today — the seed's
 *    old hidden Finance child is gone, and its courses were folded into
 *    Business, which is what this page already showed — but `Category.parentId`
 *    is still there, so the filter is what stops a sub-category ever appearing
 *    as a top-level row the export has no home for.
 *  - **A child's courses and enrolments roll up into its parent.** Otherwise
 *    the rows would not account for the whole catalog and the percentages
 *    would not add to 100.
 *  - **"3,420 courses" counts every course filed under the category**,
 *    whatever its status. That is the size of the taxonomy — the first half of
 *    the page's own lead, "how the catalog is organised" — and it is also the
 *    number that decides whether the row can be deleted, so the figure on
 *    screen and the reason Delete is disabled can never disagree.
 *  - **"182,400 students" and the bar are enrolments**, the second half of
 *    that lead: "where demand actually sits". They read
 *    `Course.enrollmentCount`, the denormalised counter the catalog, the sale
 *    page and `top-courses-card.tsx` already render, so the same category
 *    cannot show two different student numbers on two screens.
 *
 * The share is enrolments over the platform's total enrolments, and it is the
 * *only* definition on the page — the bar and the label read one number, so
 * they cannot drift. Worth knowing: the export's own six percentages
 * (38/24/18/11/6/3) reconcile with neither of its own columns — its students
 * column gives 39/22/18/10/7/4 and its courses column 36/23/17/12/8/4 — so
 * they were placed by hand, the way the Reports chart's bars were. One
 * definition wins.
 */

export type CategoryRow = {
  id: string
  slug: string
  name: string
  description: string | null
  /** The token name from the dialog's six swatches, not a hex. */
  accentColor: string
  showInNav: boolean
  /** Every course filed under it or a child of it, at any status. */
  courseCount: number
  /** Enrolments across those courses. */
  studentCount: number
  /** Whole percent of platform-wide enrolments. Drives the bar and the label. */
  share: number
  /** Sub-categories rolling up into this one — what blocks a delete. */
  childCount: number
}

export type CategoriesPage = {
  rows: CategoryRow[]
  /** Enrolments across every category, i.e. what each share is a share of. */
  totalStudents: number
}

export const getCategoriesPage = cache(
  async function getCategoriesPage(): Promise<CategoriesPage> {
    const [categories, grouped] = await Promise.all([
      db.category.findMany({
        // The column exists to be the display order, so it is what orders
        // the list. `name` breaks a tie so two categories sharing an `order`
        // don't shuffle between renders — which they can, since `order` is
        // only ever written as `max + 1` and nothing reorders it yet.
        where: { parentId: null },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          accentColor: true,
          showInNav: true,
          children: { select: { id: true } },
        },
      }),
      // One grouped query for the whole catalog rather than a count and a sum
      // per row. It deliberately carries no status filter — see the note above.
      db.course.groupBy({
        by: ["categoryId"],
        _count: { _all: true },
        _sum: { enrollmentCount: true },
      }),
    ])

    const byCategory = new Map(
      grouped.map((entry) => [
        entry.categoryId,
        {
          courses: entry._count._all,
          students: entry._sum.enrollmentCount ?? 0,
        },
      ])
    )

    const totals = categories.map((category) => {
      // The parent's own courses plus each child's, which is what makes the six
      // rows add up to the whole catalog.
      const ids = [category.id, ...category.children.map((child) => child.id)]
      return ids.reduce(
        (sum, id) => {
          const entry = byCategory.get(id)
          return {
            courses: sum.courses + (entry?.courses ?? 0),
            students: sum.students + (entry?.students ?? 0),
          }
        },
        { courses: 0, students: 0 }
      )
    })

    const totalStudents = totals.reduce((sum, entry) => sum + entry.students, 0)

    return {
      rows: categories.map((category, index) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        accentColor: category.accentColor,
        showInNav: category.showInNav,
        courseCount: totals[index]!.courses,
        studentCount: totals[index]!.students,
        share:
          totalStudents === 0
            ? 0
            : Math.round((totals[index]!.students / totalStudents) * 100),
        childCount: category.children.length,
      })),
      totalStudents,
    }
  }
)
