import { Card, CardContent } from "@/components/ui/card"
import { AvatarUpload } from "@/components/dashboard/settings/avatar-upload"
import { AdminProfileForm } from "@/components/dashboard/admin/settings/admin-profile-form"
import type { AdminProfile } from "@/lib/admin/settings"

/**
 * The right-hand card on `/dashboard/admin/settings/profile`. A Server
 * Component: only the avatar control and the form need the client, so the
 * card shell stays off the bundle — the split `settings-profile.tsx` makes.
 *
 * `AvatarUpload` is the learner's component, reused unchanged. It is not
 * learner-specific in the slightest: it uploads to the signed-in user's own
 * prefix and repoints `User.image`, which is exactly what this export's
 * "Upload image" does, and the console chrome renders that column the same
 * way the student shell does. A second copy would be one more thing to keep
 * in step with `lib/storage.ts`.
 *
 * `[--card-spacing:--spacing(7.5)]` is the export's 30px padding, set through
 * `Card`'s own variable so `CardContent`'s horizontal padding matches the
 * vertical one instead of the two being written twice.
 */
function AdminSettingsProfile({ profile }: { profile: AdminProfile }) {
  return (
    <Card className="[--card-spacing:--spacing(7.5)]">
      <CardContent>
        <AvatarUpload image={profile.image} name={profile.name} />
        <div className="mt-7">
          <AdminProfileForm profile={profile} />
        </div>
      </CardContent>
    </Card>
  )
}

export { AdminSettingsProfile }
