import { Card, CardContent } from "@/components/ui/card"
import { InstructorNotificationsForm } from "@/components/dashboard/instructor/settings/instructor-notifications-form"
import type { InstructorNotificationSettings } from "@/lib/instructor-notifications"

/**
 * The right-hand card on `/dashboard/instructor/settings/notifications` — the
 * same 922px card on 30px padding as the other three sections, and a Server
 * Component for the same reason: only the form itself needs the client.
 */
function SettingsNotifications({
  settings,
}: {
  settings: InstructorNotificationSettings
}) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <InstructorNotificationsForm settings={settings} />
      </CardContent>
    </Card>
  )
}

export { SettingsNotifications }
