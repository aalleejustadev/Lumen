"use client"

import * as React from "react"
import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { catalogCategories, courses, type Course } from "@/lib/config/catalog"
import { cn } from "@/lib/utils"

/** Course sale pages aren't built yet — this is where they'll live. */
function courseHref(course: Course) {
  return `/courses/${course.slug}`
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Card className="group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-card">
      <Link href={courseHref(course)} className="flex flex-col">
        <div
          className={cn(
            "relative grid aspect-[271/140] place-items-center bg-gradient-to-br",
            course.art
          )}
        >
          <course.icon className="size-12 text-white/25" />
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.category}
          </Badge>
        </div>

        <div className="flex flex-col px-4.5 pt-4 pb-4.5">
          <h3 className="text-[17px] leading-snug">{course.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.instructor}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <span className="font-bold tabular-nums">
              {course.rating.toFixed(1)}
            </span>
            <StarIcon className="size-3.5 fill-star text-star" />
            <span className="text-muted-foreground tabular-nums">
              ({course.reviews.toLocaleString("en-US")})
            </span>
          </p>
          <p className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums">
              {course.price}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums line-through">
              {course.listPrice}
            </span>
          </p>
        </div>
      </Link>
    </Card>
  )
}

function CatalogBrowser() {
  const [active, setActive] = React.useState<string>("All")

  const visible = React.useMemo(
    () =>
      active === "All"
        ? courses
        : courses.filter((course) => course.category === active),
    [active]
  )

  return (
    <>
      {/* One row, always: what doesn't fit runs off the edge and is reached by
          scrolling. The rail bleeds to the screen edge below md so the cut lands
          there rather than in the container's gutter, and `pt-1` keeps the
          focus ring out of the overflow clip. */}
      <div className="scroll-rail -mx-6 mt-7 overflow-x-auto px-6 pt-1 pb-2.5 md:mx-0 md:px-0">
        {/* Base UI toggle groups are single-select by default and take arrays. */}
        <ToggleGroup
          spacing={2.5}
          value={[active]}
          onValueChange={(value: string[]) => setActive(value[0] ?? "All")}
          aria-label="Filter courses by category"
          className="w-max flex-nowrap"
        >
          {catalogCategories.map((category) => (
            <ToggleGroupItem
              key={category}
              value={category}
              size="lg"
              className="shrink-0 cursor-pointer rounded-full border bg-card px-3.5 hover:bg-hover aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {category}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length > 0 ? (
        <div className="mt-6 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              No {active} courses in this preview. Pick another category.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}

export { CatalogBrowser }
