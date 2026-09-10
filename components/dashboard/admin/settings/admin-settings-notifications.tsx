import { Card, CardContent } from "@/components/ui/card"
import { AdminNotificationsForm } from "@/components/dashboard/admin/settings/admin-notifications-form"
import type { AdminNotificationSettings } from "@/lib/admin/notifications"

/**
 * The right-hand card on `/dashboard/admin/settings/notifications` — the same
 * 922px card on 30px padding as the other three sections, and a Server
 * Component for the same reason: only the form itself needs the client.
 */
function AdminSettingsNotifications({
  settings,
}: {
  settings: AdminNotificationSettings
}) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <AdminNotificationsForm settings={settings} />
      </CardContent>
    </Card>
  )
}

export { AdminSettingsNotifications }
