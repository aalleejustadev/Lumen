import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { NewUserForm } from "@/components/dashboard/admin/users/new-user-form"
import { newUserCopy } from "@/lib/config/admin-users"
import { countryOptions } from "@/lib/config/countries"

/**
 * `/dashboard/admin/users/new`, from
 * `ui-design/light/dashboard/admin/add-new-user__admin.png` — where the Users
 * table's **Add New User** goes.
 *
 * A page rather than a dialog because the export draws one: it has its own
 * "Back to users" link, its own title and lead, and a card that keeps the
 * console's chrome around it.
 *
 * Measured off that export at DPR 2: the console's 32px page inset, the back
 * link above a 32px/700 title, and a **720px** card on 30px padding, left
 * aligned rather than centred or full width.
 *
 * The country list is built **here, on the server**, and passed down as
 * `{ code, name }` pairs. `countryName` reads the runtime's ICU data, so a
 * name derived in the browser could differ from the one rendered on the
 * server; resolving once on this side is what keeps the two in agreement —
 * the same arrangement the account page's time-zone labels use.
 */
function NewUserPage() {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {newUserCopy.back}
      </Link>

      <h1 className="mt-4 text-[32px] leading-none font-bold">
        {newUserCopy.title}
      </h1>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {newUserCopy.description}
      </p>

      <Card className="mt-6 w-full max-w-[720px] ring-border">
        <CardContent className="p-7.5">
          <NewUserForm countries={countryOptions()} />
        </CardContent>
      </Card>
    </main>
  )
}

export { NewUserPage }
