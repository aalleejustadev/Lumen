"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { testimonials } from "@/lib/config/testimonials"
import { cn } from "@/lib/utils"

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

/** The pair of slanted bars tucked into the card's top-right corner. */
function QuoteMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 105 48"
      className="pointer-events-none absolute top-0 right-3 h-12 w-[105px] text-accent-1/15"
    >
      <path d="M18 0h30L30 48H0z" fill="currentColor" />
      <path d="M63 0h30L75 48H45z" fill="currentColor" />
    </svg>
  )
}

function TestimonialsSection({ className }: { className?: string }) {
  const [index, setIndex] = React.useState(0)
  const active = testimonials[index]

  const step = (delta: number) =>
    setIndex(
      (current) => (current + delta + testimonials.length) % testimonials.length
    )

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
              In their words
            </p>
            <h2 className="mt-2.5 text-4xl leading-[1.1] lg:text-[44px]">
              Both sides of the classroom.
            </h2>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous testimonial"
              onClick={() => step(-1)}
              className="size-11 cursor-pointer bg-card shadow-sm dark:bg-card"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next testimonial"
              onClick={() => step(1)}
              className="size-11 cursor-pointer bg-card shadow-sm dark:bg-card"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        {/* 686px quote card beside a 441px rail, on a 22px gutter */}
        <div className="mt-9 grid gap-5.5 md:grid-cols-[1.554fr_1fr]">
          <Card className="relative gap-0 overflow-hidden p-6 sm:p-7 lg:p-[46px]">
            <QuoteMark />
            <Badge className="h-[26px] w-fit bg-accent-1/10 px-3 text-[11px] font-bold tracking-[0.1em] text-accent-1 uppercase">
              {active.audience}
            </Badge>
            <blockquote className="mt-[21px] max-w-[545px] text-lg leading-[27px] tracking-[-0.01em] sm:text-xl sm:leading-[30px] lg:text-[27px] lg:leading-[39px]">
              {active.quote}
            </blockquote>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-8">
              <div className="flex items-center gap-3.5">
                <Avatar className="size-13.5">
                  <AvatarImage src={active.avatar} alt="" />
                  <AvatarFallback>{initialsOf(active.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold">{active.name}</span>
                  <span className="text-sm text-balance text-muted-foreground">
                    {active.role}
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
                {index + 1} / {testimonials.length}
              </p>
            </div>
          </Card>

          <ToggleGroup
            spacing={3.25}
            orientation="vertical"
            value={[active.id]}
            onValueChange={(value: string[]) => {
              const next = testimonials.findIndex((t) => t.id === value[0])
              if (next !== -1) setIndex(next)
            }}
            aria-label="Choose a testimonial"
            className="w-full"
          >
            {testimonials.map((person) => (
              <ToggleGroupItem
                key={person.id}
                value={person.id}
                className="h-[86px] w-full cursor-pointer justify-start gap-3.5 rounded-xl border bg-card px-[18px] hover:bg-hover aria-pressed:border-accent-1 aria-pressed:bg-accent-1/6"
              >
                <Avatar className="size-11">
                  <AvatarImage src={person.avatar} alt="" />
                  <AvatarFallback>{initialsOf(person.name)}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col items-start text-left">
                  <span className="text-[15px] font-bold">{person.name}</span>
                  <span className="truncate text-sm font-normal text-muted-foreground">
                    {person.role}
                  </span>
                </span>
                <span
                  className={cn(
                    "ml-auto size-2 shrink-0 rounded-full bg-track",
                    person.id === active.id && "bg-accent-1"
                  )}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </section>
  )
}

export { TestimonialsSection }
