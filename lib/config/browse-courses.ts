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

/**
 * **The 18 hand-authored courses that used to live here are gone.** The
 * catalog is `Course` rows now — read by `lib/catalog.ts` and drawn by
 * `browse-courses.tsx` — so a course an instructor builds and an admin
 * approves is the thing students see, which is what the review queue was
 * always for. What stays is the *vocabulary* the filter bar is built from:
 * the levels, the price and rating bands, the sort options and the page
 * size. None of that is course data, and all of it is drawn by a client
 * component that must not import a `server-only` module.
 */

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
