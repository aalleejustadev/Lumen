import type { LucideIcon } from "lucide-react"
import {
  BrainCircuitIcon,
  Code2Icon,
  PaletteIcon,
  TrendingUpIcon,
} from "lucide-react"

export const catalogCategories = [
  "All",
  "Development",
  "Design",
  "Data & AI",
  "Business",
  "Marketing",
] as const

export type CatalogCategory = (typeof catalogCategories)[number]

export type Course = {
  slug: string
  title: string
  instructor: string
  category: Exclude<CatalogCategory, "All">
  rating: number
  reviews: number
  price: string
  listPrice: string
  /** Placeholder artwork until real course images land. */
  art: string
  icon: LucideIcon
}

export const courses: Course[] = [
  {
    slug: "mastering-illustration",
    title: "Mastering Illustration",
    instructor: "Simon Simorangkir",
    category: "Design",
    rating: 4.9,
    reviews: 12480,
    price: "$16.99",
    listPrice: "$99.99",
    art: "from-accent-1 to-accent-2",
    icon: PaletteIcon,
  },
  {
    slug: "the-complete-react-bootcamp",
    title: "The Complete React Bootcamp",
    instructor: "Maya Okonkwo",
    category: "Development",
    rating: 4.7,
    reviews: 31204,
    price: "$14.99",
    listPrice: "$89.99",
    art: "from-accent-2 to-accent-3",
    icon: Code2Icon,
  },
  {
    slug: "machine-learning-a-z",
    title: "Machine Learning A–Z",
    instructor: "Dr. Elias Vance",
    category: "Data & AI",
    rating: 4.8,
    reviews: 18940,
    price: "$15.99",
    listPrice: "$99.99",
    art: "from-accent-3 to-accent-1",
    icon: BrainCircuitIcon,
  },
  {
    slug: "financial-modeling-masterclass",
    title: "Financial Modeling Masterclass",
    instructor: "Sara Lindqvist",
    category: "Business",
    rating: 4.6,
    reviews: 7320,
    price: "$13.99",
    listPrice: "$79.99",
    art: "from-warning to-star",
    icon: TrendingUpIcon,
  },
]
