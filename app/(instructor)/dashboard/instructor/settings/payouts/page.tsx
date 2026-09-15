import type { Metadata } from "next"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Card, CardContent } from "@/components/ui/card"
import { SettingsPayouts } from "@/components/dashboard/instructor/settings/settings-payouts"
import { getPayoutSettings } from "@/lib/instructor-payouts"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Payout settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/settings/payouts`, from
 * `ui-design/light/dashboard/instructor/payout-settings-page.png`.
 *
 * **Nothing on it is demo data and it needed no migration** — `PayoutMethod`
 * and the three `Instructor` payout columns were already shaped for this
 * export, docstrings and all (`PayoutMethod`'s own note names the Primary /
 * Backup pills this page draws, and `payoutDayOfMonth`'s names the schedule
 * row's sentence). `lib/instructor-payouts.ts` reads,
 * `lib/config/instructor-payouts.ts` is every word the page says, and
 * `lib/actions/instructor-payouts.ts` is the three writes.
 *
 * **Null is not "signed out" here**, unlike on the profile and account routes,
 * so this one does not redirect. `app/(instructor)/layout.tsx` admits an
 * account carrying the `instructor` role whose `Instructor` row is still being
 * written — `canTeach`'s own documented window — and that account has a
 * session but no payout profile. Sending it to sign in would be a lie about
 * what is wrong; it is told to come back instead.
 *
 * The heading and the sections card come from the group's layout.
 */
export default async function Page() {
  const settings = await getPayoutSettings()

  if (!settings) {
    return (
      <Card className="[--card-spacing:--spacing(7.5)]">
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                Your teaching profile isn&apos;t ready yet
              </EmptyTitle>
              <EmptyDescription>
                Payout settings appear once your instructor profile has finished
                being set up. Check back shortly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return <SettingsPayouts settings={settings} />
}
