import { Card, CardContent } from "@/components/ui/card"
import { AccountForm } from "@/components/dashboard/settings/account-form"
import type { Account } from "@/lib/account"
import { timeZoneOptions } from "@/lib/config/locale"

/**
 * The right-hand card on `/dashboard/settings/account` — the same 922px card
 * on 30px padding as `settings-profile.tsx`, and a Server Component for the
 * same reason: only the form itself needs the client.
 *
 * The time-zone labels are built here, on the server, and handed down as
 * props. They carry a `(GMT±HH:MM)` offset that depends on "now", so deriving
 * them in one place is what stops the server's render and the browser's from
 * disagreeing either side of a DST change.
 */
function SettingsAccount({ account }: { account: Account }) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <AccountForm account={account} timeZones={timeZoneOptions()} />
      </CardContent>
    </Card>
  )
}

export { SettingsAccount }
