import { Card, CardContent } from "@/components/ui/card"
import { AvatarUpload } from "@/components/dashboard/settings/avatar-upload"
import { ProfileForm } from "@/components/dashboard/settings/profile-form"
import type { Profile } from "@/lib/profile"

/**
 * The right-hand card on `/dashboard/settings/profile`. A Server Component:
 * only the avatar control and the form itself need the client, so the card
 * shell stays off the bundle — the same split `my-learning.tsx` uses.
 *
 * `[--card-spacing:--spacing(7.5)]` is the export's 30px padding, set through
 * `Card`'s own variable so `CardContent`'s horizontal padding matches the
 * vertical one instead of the two being written twice.
 */
function SettingsProfile({ profile }: { profile: Profile }) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <AvatarUpload image={profile.image} name={profile.name} />
        <div className="mt-7">
          <ProfileForm profile={profile} />
        </div>
      </CardContent>
    </Card>
  )
}

export { SettingsProfile }
