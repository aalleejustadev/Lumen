"use client"

import * as React from "react"
import {
  ArrowUpDownIcon,
  BarChart3Icon,
  DollarSignIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CourseCard } from "@/components/dashboard/courses/course-card"
import {
  browseCourseCategories,
  browseCourses,
  COURSES_PER_PAGE,
  levelFilters,
  priceFilters,
  ratingFilters,
  sortOptions,
  type LevelFilterValue,
  type PriceFilter,
  type RatingFilterValue,
  type SortOption,
} from "@/lib/config/browse-courses"
import { cn } from "@/lib/utils"

/** A filter chip: an icon-led `Select` styled as the pill from the export
 *  rather than the component's default bordered-rectangle look. */
function FilterSelect<T extends string>({
  icon: Icon,
  value,
  onValueChange,
  options,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: T
  onValueChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
      <SelectTrigger className="h-9 gap-1.5 rounded-full border-border bg-card px-3.5 text-sm font-medium data-[size=default]:h-9">
        <Icon className="size-4 text-muted-foreground" />
        <SelectValue>
          {(current: T) =>
            options.find((option) => option.value === current)?.label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-44"
      >
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="py-2 pl-2.5"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/**
 * `/dashboard/courses` — the student catalog, from
 * `browse-courses-page.png`. Filtering, sorting, search and pagination all
 * run client-side over the demo data in `lib/config/browse-courses.ts`;
 * swap that file for real `Course` queries once instructors can publish.
 */
function BrowseCourses() {
  const [category, setCategory] = React.useState<string>("All")
  const [query, setQuery] = React.useState("")
  const [priceFilter, setPriceFilter] = React.useState<PriceFilter>("any")
  const [levelFilter, setLevelFilter] = React.useState<LevelFilterValue>("any")
  const [ratingFilter, setRatingFilter] =
    React.useState<RatingFilterValue>("any")
  const [sort, setSort] = React.useState<SortOption>("popular")
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const minRating = ratingFilter === "any" ? 0 : Number(ratingFilter)

    const result = browseCourses.filter((course) => {
      if (category !== "All" && course.category !== category) return false
      if (
        needle &&
        !course.title.toLowerCase().includes(needle) &&
        !course.instructor.toLowerCase().includes(needle)
      )
        return false
      if (priceFilter === "under-15" && course.price >= 15) return false
      if (priceFilter === "15-17" && (course.price < 15 || course.price > 17))
        return false
      if (priceFilter === "over-17" && course.price <= 17) return false
      if (levelFilter !== "any" && course.level !== levelFilter) return false
      if (course.rating < minRating) return false
      return true
    })

    return result.sort((a, b) => {
      switch (sort) {
        case "rating":
          return b.rating - a.rating || b.reviews - a.reviews
        case "newest":
          return b.id - a.id
        case "price-asc":
          return a.price - b.price
        case "price-desc":
          return b.price - a.price
        default:
          return b.reviews - a.reviews
      }
    })
  }, [category, query, priceFilter, levelFilter, ratingFilter, sort])

  // Any filter change can leave the current page out of range — snap back
  // rather than render an empty grid with pages left to click through.
  const pageCount = Math.max(1, Math.ceil(filtered.length / COURSES_PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * COURSES_PER_PAGE
  const visible = filtered.slice(start, start + COURSES_PER_PAGE)

  function updateFilter<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-none">Browse Courses</h1>
          <p className="mt-2.5 text-muted-foreground">
            Explore 12,000+ courses across every subject. Buy once, learn
            forever.
          </p>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search courses..."
            className="h-10 w-[300px] rounded-lg bg-card pl-10 text-sm"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="scroll-rail -mx-6 overflow-x-auto px-6 pt-1 pb-1 md:mx-0 md:px-0">
          <ToggleGroup
            spacing={2.5}
            value={[category]}
            onValueChange={(value: string[]) =>
              updateFilter(setCategory)(value[0] ?? "All")
            }
            aria-label="Filter courses by category"
            className="w-max flex-nowrap"
          >
            {browseCourseCategories.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                size="lg"
                className="shrink-0 cursor-pointer rounded-full border bg-card px-3.5 hover:bg-hover aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <FilterSelect
          icon={ArrowUpDownIcon}
          value={sort}
          onValueChange={setSort}
          options={sortOptions}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterSelect
            icon={DollarSignIcon}
            value={priceFilter}
            onValueChange={updateFilter(setPriceFilter)}
            options={priceFilters}
          />
          <FilterSelect
            icon={BarChart3Icon}
            value={levelFilter}
            onValueChange={updateFilter(setLevelFilter)}
            options={levelFilters}
          />
          <FilterSelect
            icon={StarIcon}
            value={ratingFilter}
            onValueChange={updateFilter(setRatingFilter)}
            options={ratingFilters}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} course{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="mt-6 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>No courses match</EmptyTitle>
            <EmptyDescription>
              Try a different category, search term, or filter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {filtered.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1}–
            {Math.min(start + COURSES_PER_PAGE, filtered.length)} of{" "}
            {filtered.length} courses
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={cn(
                    "bg-card",
                    safePage <= 1 && "pointer-events-none opacity-50"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.max(1, current - 1))
                  }}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      isActive={pageNumber === safePage}
                      // `!` forces these: `isActive` makes `PaginationLink`
                      // use the "outline" Button variant, whose
                      // `dark:bg-input/30` — a `:is(.dark *)`-wrapped
                      // selector — outranks a plain `bg-primary` on
                      // specificity in dark mode regardless of source
                      // order, the same trap `size-14` hit on `Avatar` (see
                      // the note on `instructor-header-card.tsx`).
                      className={cn(
                        pageNumber === safePage
                          ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                          : "bg-card"
                      )}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(pageNumber)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  className={cn(
                    "bg-card",
                    safePage >= pageCount && "pointer-events-none opacity-50"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.min(pageCount, current + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}

export { BrowseCourses }
