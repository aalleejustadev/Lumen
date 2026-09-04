import type { Metadata } from "next"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Dashboard · ${siteConfig.name}`,
}

/**
 * Placeholder. The layout above already guarantees a session, so this only has
 * to prove it: the header knows you, and so does the page. The real dashboard
 * is a separate build against `ui-design/light/dashboard/`.
 */
export default async function DashboardPage() {
  const session = await getSession()
  const user = session!.user

  const firstName = user.name.split(" ")[0] || user.name

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
      <h1 className="text-4xl leading-[1.1] lg:text-[44px]">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-3 max-w-[700px] text-lg leading-[1.5] tracking-[-0.01em] text-muted-foreground">
        You&rsquo;re signed in — this is the shell the real dashboard will fill.
      </p>

      <Card className="mt-8 max-w-[520px] gap-0 p-6.5 ring-border">
        <h2 className="text-base">Your account</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{user.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-muted-foreground">Email verified</dt>
            <dd>
              <Badge
                className={
                  user.emailVerified
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }
              >
                {user.emailVerified ? "Verified" : "Not yet"}
              </Badge>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-muted-foreground">Signed up to</dt>
            <dd className="font-medium">
              {user.intent === "TEACHING" ? "Teach" : "Learn"}
            </dd>
          </div>
        </dl>
      </Card>
    </main>
  )
}
