import Link from "next/link"
import { CirclePlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UsersStats } from "@/components/dashboard/admin/users/users-stats"
import {
  UsersTable,
  type UsersTableRow,
} from "@/components/dashboard/admin/users/users-table"
import { adminUsersCopy } from "@/lib/config/admin-users"
import { countryName } from "@/lib/config/countries"
import { getUsersPage, getUserStats, type UsersQuery } from "@/lib/admin/users"

/**
 * `/dashboard/admin/users`, from
 * `ui-design/light/dashboard/admin/users-page__admin.png`: the title with its
 * lead and **Add New User**, the four-up KPI row, and the card holding the
 * toolbar, the table and the pager.
 *
 * Measured off that export at DPR 2: the console's usual 32px page inset, a
 * 32px/700 title over a 15px lead with the 40px button centred against the
 * pair, 16px from the lead to the stat row and 24px from there to the card.
 * The title carries an explicit `font-bold` for the reason `CLAUDE.md` gives:
 * `globals.css` sets every `h1` to 800 and the dashboard exports draw 700.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 *
 * **Country names are resolved here, on the server**, and cross to the table
 * as strings. `Intl.DisplayNames` reads the runtime's own ICU data, so Node's
 * answer for a code and a browser's can differ by a word — deriving the name
 * on both sides of the boundary is a hydration mismatch waiting for the one
 * country they disagree about. Same call the account page's time-zone labels
 * make.
 */
async function UsersPage({ query }: { query: UsersQuery }) {
  const [stats, page] = await Promise.all([getUserStats(), getUsersPage(query)])

  const rows: UsersTableRow[] = page.rows.map((row) => ({
    ...row,
    countryLabel: countryName(row.country),
  }))

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {adminUsersCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {adminUsersCopy.description}
          </p>
        </div>

        <Button
          nativeButton={false}
          render={<Link href="/dashboard/admin/users/new" />}
          className="h-10 gap-2 px-5"
        >
          <CirclePlusIcon className="size-4.5" />
          {adminUsersCopy.addLabel}
        </Button>
      </div>

      <div className="mt-4">
        <UsersStats stats={stats} />
      </div>

      <UsersTable rows={rows} page={page} query={query} />
    </main>
  )
}

export { UsersPage }
