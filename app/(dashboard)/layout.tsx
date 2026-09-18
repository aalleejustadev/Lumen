import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { getSession } from "@/lib/auth"
import { getCartCount, getWishlistCount } from "@/lib/cart"
import { getUnreadCount } from "@/lib/notification-feed"
import { getUnreadMessageCount } from "@/lib/messages"
import { canBecomeInstructor, canTeach } from "@/lib/instructor"
import { getBusinessOffer } from "@/lib/subscription"

/**
 * Everything under this group requires a session — the guard lives here rather
 * than in each page so a new route can't forget it.
 *
 * `--sidebar-width` is the export's 244px panel, and `DashboardHeader` is the
 * bar from `dashboard-header.png`. Both read the session from here rather than
 * fetching their own.
 *
 * The header's cart badge and the sidebar's Wishlist count are counted here
 * too, for the same reason: they are chrome shared by every dashboard route,
 * so they belong to the shell rather than to whichever page happens to be
 * underneath. `navCounts` is keyed by href so the layout — not the sidebar —
 * owns which rows carry a real number; anything unlisted keeps the
 * placeholder from `lib/config/dashboard.ts`.
 *
 * Neither the admin console nor the instructor workspace is under this group —
 * each has its own shell in `app/(admin)/` and `app/(instructor)/`, for the
 * reason those layouts explain. So the only thing this one knows about the
 * other two is which of them to *offer*: the account menu's "Admin console"
 * row, and the sidebar's Student / Instructor switch.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { user } = session
  // shadcn's provider writes `sidebar_state` on every toggle; reading it here
  // is what makes the rail survive a reload.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  const [
    cartCount,
    wishlistCount,
    showInstructorCta,
    teaches,
    unreadNotifications,
    unreadMessages,
    businessOffer,
  ] = await Promise.all([
    getCartCount(),
    getWishlistCount(),
    canBecomeInstructor(user),
    // Whether the sidebar's Student / Instructor switch offers its second
    // half. The same function `app/(instructor)/layout.tsx` guards on, so the
    // control cannot offer a mode the guard would then refuse.
    canTeach(user),
    getUnreadCount("LEARNER"),
    getUnreadMessageCount("LEARNER"),
    // Decides whether the sidebar draws its Lumen Business promo, and quotes
    // the plan's real Stripe price when it does. Read here rather than in the
    // sidebar for the reason the cart badge and the wishlist count are: it is
    // chrome shared by every dashboard route, so it belongs to the shell.
    getBusinessOffer(),
  ])

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={
        {
          "--sidebar-width": "244px",
          // The collapsed rail from `sidebar-toggled.png`.
          "--sidebar-width-icon": "76px",
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        isAdmin={user.role === "admin"}
        canTeach={teaches}
        // Only a student who could actually buy it: not a subscriber, and not
        // when Stripe has no prices configured. The *mode* half needs no check
        // here — the instructor and admin shells have their own sidebars and
        // neither renders the card.
        showUpgrade={businessOffer.state === "available"}
        businessOffer={businessOffer}
        navCounts={{
          "/dashboard/wishlist": wishlistCount,
          // Omitted at zero rather than passed as 0: `NavRow` draws a badge
          // for any number it is given, and "0 unread" is noise.
          ...(unreadNotifications > 0
            ? { "/dashboard/notifications": unreadNotifications }
            : {}),
          ...(unreadMessages > 0
            ? { "/dashboard/messages": unreadMessages }
            : {}),
        }}
      />
      <SidebarInset>
        <DashboardHeader
          unreadNotifications={unreadNotifications}
          user={{ name: user.name, email: user.email, image: user.image }}
          isAdmin={user.role === "admin"}
          cartCount={cartCount}
          showInstructorCta={showInstructorCta}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
