export type BillingPeriod = "monthly" | "yearly"

export type Plan = {
  id: string
  name: string
  /** Same value for both periods when the plan isn't a subscription. */
  price: Record<BillingPeriod, string>
  suffix: Record<BillingPeriod, string>
  description: string
  features: string[]
  cta: { label: string; href: string }
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: "per-course",
    name: "Per course",
    price: { monthly: "$12–17", yearly: "$12–17" },
    suffix: { monthly: "one-off", yearly: "one-off" },
    description: "Buy a course outright and keep it for life.",
    features: [
      "Lifetime access to what you buy",
      "Certificate on completion",
      "Full Q&A and discussions",
      "30-day refund guarantee",
    ],
    cta: { label: "Browse courses", href: "/courses" },
  },
  {
    id: "lumen-business",
    name: "Lumen Business",
    price: { monthly: "$29", yearly: "$299" },
    suffix: { monthly: "/month", yearly: "/year" },
    description:
      "Every course from every instructor, while your plan is active.",
    features: [
      "All 12,000 courses unlocked",
      "New releases included",
      "Team seats and reporting",
      "Priority support",
      "Cancel any time",
    ],
    cta: { label: "Start free trial", href: "/register" },
    featured: true,
  },
  {
    id: "teach-on-lumen",
    name: "Teach on Lumen",
    price: { monthly: "Free", yearly: "Free" },
    suffix: { monthly: "to publish", yearly: "to publish" },
    description: "No listing fees. You only share revenue when you earn.",
    features: [
      "Unlimited courses and students",
      "Keep up to 70% of revenue",
      "Analytics, coupons, and payouts",
      "Monthly payouts from $100",
    ],
    cta: { label: "Become an instructor", href: "/teach" },
  },
]
