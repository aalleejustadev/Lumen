import { CategoriesList } from "@/components/dashboard/admin/categories/categories-list"
import { getCategoriesPage } from "@/lib/admin/categories"

/**
 * `/dashboard/admin/categories`, from
 * `ui-design/light/dashboard/admin/categories-page__admin.png`.
 *
 * A thin composer: unlike `courses-page.tsx` or `users-page.tsx` the title and
 * its lead live *inside* `CategoriesList`, because the export puts **New
 * category** in the same row as the `h1` and that button opens a dialog — so
 * the header row has to be client either way. `wishlist-page.tsx` is client
 * all the way up for exactly this reason. What stays here is the read, which
 * is the half that must not reach the browser: `lib/admin/categories.ts`
 * imports `lib/db`.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 *
 * The page inset, the 32px/700 title and the 15px lead are the console's, and
 * the title takes an explicit `font-bold` for the reason `CLAUDE.md` gives:
 * `globals.css` sets every `h1` to 800 and the dashboard exports draw 700.
 *
 * **Nothing on the page is demo data, and this page is the only thing that
 * writes these rows** — `Category` already carried every column the two
 * exports ask for, and the seed resolves categories rather than authoring
 * them. See `lib/admin/categories.ts` for why.
 */
async function CategoriesPage() {
  const page = await getCategoriesPage()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CategoriesList rows={page.rows} />
    </main>
  )
}

export { CategoriesPage }
