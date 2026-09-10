import { Card, CardContent } from "@/components/ui/card"
import { PlatformControlsForm } from "@/components/dashboard/admin/settings/platform-controls-form"
import type { PlatformSetting } from "@/lib/generated/prisma/client"

/**
 * The right-hand card on `/dashboard/admin/settings/platform` — the same
 * 922px card on 30px padding as the other three sections, and a Server
 * Component for the same reason: only the form itself needs the client.
 */
function AdminSettingsPlatform({ settings }: { settings: PlatformSetting }) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <PlatformControlsForm settings={settings} />
      </CardContent>
    </Card>
  )
}

export { AdminSettingsPlatform }
