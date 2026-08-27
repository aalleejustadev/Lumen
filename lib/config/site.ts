export const siteConfig = {
  name: "Lumen",
  description: "Learn anything. Teach everything.",
  url: "https://lumen.dev",
} as const

export type NavItem = {
  title: string
  href: string
}

/** Primary navigation for the marketing site. */
export const marketingNav: NavItem[] = [
  { title: "Features", href: "/features" },
  { title: "Courses", href: "/courses" },
  { title: "Teach", href: "/teach" },
  { title: "Pricing", href: "/pricing" },
]
