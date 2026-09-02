export const siteConfig = {
  name: "Lumen",
  description: "Learn anything. Teach everything.",
  /** Footer strapline — shorter than the description, per the design. */
  tagline: "One platform for both sides of the classroom.",
  legalName: "Lumen Learning, Inc.",
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

export type NavGroup = {
  title: string
  items: NavItem[]
}

/** Footer link columns, in the order the design lays them out. */
export const footerNav: NavGroup[] = [
  {
    title: "Learn",
    items: [
      { title: "Browse courses", href: "/courses" },
      { title: "Categories", href: "/categories" },
      { title: "Certificates", href: "/certificates" },
      { title: "Lumen Business", href: "/business" },
    ],
  },
  {
    title: "Teach",
    items: [
      { title: "Become an instructor", href: "/teach" },
      { title: "Instructor help", href: "/teach/help" },
      { title: "Payouts", href: "/teach/payouts" },
      { title: "Course standards", href: "/teach/standards" },
    ],
  },
  {
    title: "Company",
    items: [
      { title: "About", href: "/about" },
      { title: "Careers", href: "/careers" },
      { title: "Blog", href: "/blog" },
      { title: "Contact", href: "/contact" },
    ],
  },
]

/** Bottom bar of the footer, opposite the copyright line. */
export const footerLegalNav: NavItem[] = [
  { title: "Privacy", href: "/privacy" },
  { title: "Terms", href: "/terms" },
  { title: "Status", href: "/status" },
]
