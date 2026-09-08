import { Card, CardContent } from "@/components/ui/card"
import { NotificationsForm } from "@/components/dashboard/settings/notifications-form"
import type { NotificationSettings } from "@/lib/notifications"

/**
 * The right-hand card on `/dashboard/settings/notifications` — the same 922px
 * card on 30px padding as `settings-profile.tsx` and `settings-account.tsx`,
 * and a Server Component for the same reason: only the form itself needs the
 * client.
 */
function SettingsNotifications({
  settings,
}: {
  settings: NotificationSettings
}) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <NotificationsForm settings={settings} />
      </CardContent>
    </Card>
  )
}

export { SettingsNotifications }
