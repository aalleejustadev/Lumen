import { Card, CardContent } from "@/components/ui/card"
import { PayoutSettingsForm } from "@/components/dashboard/instructor/settings/payout-settings-form"
import type { PayoutSettings } from "@/lib/instructor-payouts"

/**
 * The right-hand card on `/dashboard/instructor/settings/payouts` — the same
 * 922px card on 30px padding as the other three sections, and a Server
 * Component for the same reason `settings-profile.tsx` is: only the form
 * inside it needs the client, so the shell stays off the bundle.
 *
 * `[--card-spacing:--spacing(7.5)]` is the export's 30px padding, set through
 * `Card`'s own variable so `CardContent`'s horizontal padding matches the
 * vertical one instead of the two being written twice.
 */
function SettingsPayouts({ settings }: { settings: PayoutSettings }) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <PayoutSettingsForm settings={settings} />
      </CardContent>
    </Card>
  )
}

export { SettingsPayouts }
