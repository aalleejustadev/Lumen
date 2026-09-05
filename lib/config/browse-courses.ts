import {
  BrainCircuitIcon,
  BriefcaseIcon,
  Code2Icon,
  LineChartIcon,
  MegaphoneIcon,
  PaletteIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Demo content for `/dashboard/courses`, measured off
 * `ui-design/light/dashboard/student/browse-courses-page.png`. `Course` in
 * `prisma/schema.prisma` now exists for this data, but there's no
 * instructor-authoring flow yet to populate it — so, like the Overview page,
 * this file is the data source until that flow lands. Course art is a
 * per-category gradient + icon rather than the export's photos, same
 * reasoning as `components/marketing/catalog-browser.tsx` — see the
 * `lumen-course-card-art` note: real images arrive through instructor
 * uploads, not a stock-photo integration.
 */

export const browseCourseCategories = [
  "All",
  "Web Dev",
  "Design",
  "Data & AI",
  "Business",
  "Marketing",
  "Finance",
] as const

export type BrowseCourseCategory = Exclude<
  (typeof browseCourseCategories)[number],
  "All"
>

export const courseLevels = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
] as const

export type CourseLevel = (typeof courseLevels)[number]

/** Maps to `CourseCategory` in `prisma/schema.prisma` (WEB_DEV, DESIGN, …). */
export const categoryIcons: Record<BrowseCourseCategory, LucideIcon> = {
  "Web Dev": Code2Icon,
  Design: PaletteIcon,
  "Data & AI": BrainCircuitIcon,
  Business: BriefcaseIcon,
  Marketing: MegaphoneIcon,
  Finance: LineChartIcon,
}

/** Gradient stops cycled across cards for visual variety — not tied to
 *  category, matching how `lib/config/dashboard-overview.ts` assigns art. */
const artCycle = [
  "from-accent-1 to-accent-2",
  "from-accent-2 to-accent-3",
  "from-accent-3 to-accent-1",
  "from-warning to-star",
  "from-accent-1 to-accent-3",
  "from-accent-2 to-accent-1",
]

export type BrowseCourse = {
  /** Chronological add order — "Newest" sorts on this, high to low. */
  id: number
  slug: string
  title: string
  instructor: string
  category: BrowseCourseCategory
  level: CourseLevel
  durationHours: number
  rating: number
  reviews: number
  /** Dollars, not cents — this file is display data, not the `Course` row. */
  price: number
  listPrice: number
  art: string
  icon: LucideIcon
}

type CourseSeed = Omit<BrowseCourse, "id" | "art" | "icon">

const courseSeeds: CourseSeed[] = [
  {
    slug: "python-for-everybody",
    title: "Python for Everybody",
    instructor: "Marco Devine",
    category: "Web Dev",
    level: "Beginner",
    durationHours: 38,
    rating: 4.9,
    reviews: 48300,
    price: 13.99,
    listPrice: 84.99,
  },
  {
    slug: "the-complete-react-bootcamp",
    title: "The Complete React Bootcamp",
    instructor: "Maya Okonkwo",
    category: "Web Dev",
    level: "All Levels",
    durationHours: 52,
    rating: 4.7,
    reviews: 31204,
    price: 14.99,
    listPrice: 89.99,
  },
  {
    slug: "machine-learning-a-z",
    title: "Machine Learning A–Z",
    instructor: "Dr. Elias Vance",
    category: "Data & AI",
    level: "Intermediate",
    durationHours: 44,
    rating: 4.8,
    reviews: 28910,
    price: 15.99,
    listPrice: 99.99,
  },
  {
    slug: "photography-foundations",
    title: "Photography Foundations",
    instructor: "Marco Devine",
    category: "Design",
    level: "Beginner",
    durationHours: 20,
    rating: 4.7,
    reviews: 18920,
    price: 12.99,
    listPrice: 74.99,
  },
  {
    slug: "digital-marketing-complete",
    title: "Digital Marketing Complete",
    instructor: "Sara Lindqvist",
    category: "Marketing",
    level: "All Levels",
    durationHours: 26,
    rating: 4.5,
    reviews: 17640,
    price: 12.99,
    listPrice: 79.99,
  },
  {
    slug: "financial-modeling-masterclass",
    title: "Financial Modeling Masterclass",
    instructor: "Alina Kessler",
    category: "Finance",
    level: "Intermediate",
    durationHours: 30,
    rating: 4.8,
    reviews: 14120,
    price: 16.99,
    listPrice: 94.99,
  },
  {
    slug: "design-systems-in-figma",
    title: "Design Systems in Figma",
    instructor: "Simon Simorangkir",
    category: "Design",
    level: "Intermediate",
    durationHours: 18,
    rating: 4.9,
    reviews: 13760,
    price: 16.99,
    listPrice: 99.99,
  },
  {
    slug: "mastering-illustration",
    title: "Mastering Illustration",
    instructor: "Simon Simorangkir",
    category: "Design",
    level: "Beginner",
    durationHours: 24,
    rating: 4.9,
    reviews: 12480,
    price: 16.99,
    listPrice: 99.99,
  },
  {
    slug: "advanced-typescript-patterns",
    title: "Advanced TypeScript Patterns",
    instructor: "Maya Okonkwo",
    category: "Web Dev",
    level: "Advanced",
    durationHours: 22,
    rating: 4.8,
    reviews: 9540,
    price: 14.99,
    listPrice: 84.99,
  },
  {
    slug: "ux-research-fundamentals",
    title: "UX Research Fundamentals",
    instructor: "Simon Simorangkir",
    category: "Design",
    level: "Beginner",
    durationHours: 16,
    rating: 4.6,
    reviews: 8210,
    price: 12.99,
    listPrice: 69.99,
  },
  {
    slug: "deep-learning-with-pytorch",
    title: "Deep Learning with PyTorch",
    instructor: "Dr. Elias Vance",
    category: "Data & AI",
    level: "Advanced",
    durationHours: 48,
    rating: 4.9,
    reviews: 11300,
    price: 17.99,
    listPrice: 109.99,
  },
  {
    slug: "startup-finance-101",
    title: "Startup Finance 101",
    instructor: "Alina Kessler",
    category: "Business",
    level: "Beginner",
    durationHours: 14,
    rating: 4.5,
    reviews: 6480,
    price: 11.99,
    listPrice: 64.99,
  },
  {
    slug: "seo-and-content-strategy",
    title: "SEO & Content Strategy",
    instructor: "Sara Lindqvist",
    category: "Marketing",
    level: "All Levels",
    durationHours: 19,
    rating: 4.4,
    reviews: 5920,
    price: 12.99,
    listPrice: 74.99,
  },
  {
    slug: "investing-in-the-stock-market",
    title: "Investing in the Stock Market",
    instructor: "Alina Kessler",
    category: "Finance",
    level: "Intermediate",
    durationHours: 21,
    rating: 4.7,
    reviews: 9860,
    price: 13.99,
    listPrice: 79.99,
  },
  {
    slug: "nodejs-for-backend-developers",
    title: "Node.js for Backend Developers",
    instructor: "Marco Devine",
    category: "Web Dev",
    level: "Intermediate",
    durationHours: 32,
    rating: 4.6,
    reviews: 10730,
    price: 14.99,
    listPrice: 89.99,
  },
]

export const browseCourses: BrowseCourse[] = courseSeeds.map((seed, index) => ({
  ...seed,
  id: index + 1,
  art: artCycle[index % artCycle.length]!,
  icon: categoryIcons[seed.category],
}))

export const COURSES_PER_PAGE = 8

export const priceFilters = [
  { value: "any", label: "Any price" },
  { value: "under-15", label: "Under $15" },
  { value: "15-17", label: "$15 – $17" },
  { value: "over-17", label: "$17+" },
] as const

export type PriceFilter = (typeof priceFilters)[number]["value"]

export const levelFilters = [
  { value: "any", label: "Any level" },
  ...courseLevels.map((level) => ({ value: level, label: level })),
] as const

export type LevelFilterValue = (typeof levelFilters)[number]["value"]

export const ratingFilters = [
  { value: "any", label: "Any rating" },
  { value: "4.5", label: "4.5 & up" },
  { value: "4.0", label: "4.0 & up" },
  { value: "3.5", label: "3.5 & up" },
] as const

export type RatingFilterValue = (typeof ratingFilters)[number]["value"]

export const sortOptions = [
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const

export type SortOption = (typeof sortOptions)[number]["value"]
