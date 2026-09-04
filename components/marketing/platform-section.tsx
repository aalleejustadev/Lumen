import Link from "next/link"
import {
  ArrowRightIcon,
  ArrowUpDownIcon,
  AwardIcon,
  CheckIcon,
  ClockIcon,
  FileQuestionMarkIcon,
  MessageCircleQuestionMarkIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: FileQuestionMarkIcon,
    title: "Quizzes that teach",
    body: "Every question explains itself after you answer. Retake as often as you like — your best score sticks.",
  },
  {
    icon: MessageCircleQuestionMarkIcon,
    title: "Ask inside the lesson",
    body: "Q&A lives on the course page, scoped to enrolled learners. Your instructor answers where you got stuck.",
  },
  {
    icon: AwardIcon,
    title: "Verifiable certificates",
    body: "Issued automatically, with a credential ID anyone can check. Add it straight to your profile.",
  },
  {
    icon: ArrowUpDownIcon,
    title: "One account, both roles",
    body: "Learn on Monday, teach on Tuesday. Switch modes and the whole workspace follows.",
  },
]

const audiences = [
  {
    eyebrow: "For learners",
    tint: "bg-accent-2/10 text-accent-2",
    check: "bg-success",
    title: "Finish what you start.",
    body: "Most courses get abandoned around lesson four. Lumen is designed to get you past it.",
    points: [
      "Pick up exactly where you left off, on any device",
      "Timestamped notes so revision takes minutes, not hours",
      "Ask questions inside the lesson and get real answers",
      "Lifetime access to every course you buy outright",
    ],
    cta: {
      label: "Browse courses",
      href: "/courses",
      variant: "default" as const,
    },
  },
  {
    eyebrow: "For instructors",
    tint: "bg-accent-1/10 text-accent-1",
    check: "bg-accent-1",
    title: "Teach without the admin.",
    body: "Build a course in an afternoon, and let the platform handle payments, hosting, and support.",
    points: [
      "Drag-and-drop builder for video, articles, and quizzes",
      "Keep up to 70% of revenue, paid on the 1st monthly",
      "Analytics that show which lesson loses people",
      "Coupons, reviews, and student messaging built in",
    ],
    cta: {
      label: "Start teaching",
      href: "/teach",
      variant: "accent" as const,
    },
  },
]

/** Amber markers sit at the measured positions along the scrubber. */
const timelineMarkers = [17.9, 44, 71]

function FeatureIcon({
  icon: Icon,
  brand,
}: {
  icon: typeof ClockIcon
  brand?: boolean
}) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl",
        brand
          ? "bg-logo size-11 text-white"
          : "size-10.5 bg-hover text-foreground"
      )}
    >
      <Icon className={brand ? "size-5" : "size-4.5"} />
    </span>
  )
}

/** The scrubber mock inside the first bento card. */
function NoteTimeline() {
  return (
    <div className="mt-6 rounded-xl border bg-soft p-4 lg:mt-auto">
      <div className="relative h-1.5 rounded-full bg-track">
        <div className="h-full w-[44.5%] rounded-full bg-bar-fill" />
        {timelineMarkers.map((left) => (
          <span
            key={left}
            style={{ left: `${left}%` }}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-star ring-2 ring-soft"
          />
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-3">
        <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground tabular-nums">
          10:40
        </span>
        <span className="text-sm text-muted-foreground">
          Shortcut for the shape builder — revisit this.
        </span>
      </div>
    </div>
  )
}

function PlatformSection({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
        <p className="text-xs font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
          The platform
        </p>
        {/* 44px on a 48.5px line in the export */}
        <h2 className="mt-2.5 max-w-[640px] text-4xl leading-[1.1] lg:text-[44px]">
          Built for how people actually learn.
        </h2>
        <p className="mt-3 max-w-[700px] text-lg leading-[1.5] tracking-[-0.01em] text-muted-foreground">
          Not a video dump with a progress bar. Every feature exists because it
          moves someone from watching to understanding.
        </p>

        {/* 3 x 372px columns on 18px gutters; the lead card takes two of them.
            Halves first, so the bento never becomes a column of letterboxes on
            a tablet. */}
        <div className="mt-8.5 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="gap-0 p-6.5 sm:col-span-2 lg:min-h-[317px]">
            <FeatureIcon icon={ClockIcon} brand />
            <h3 className="mt-5.5 text-base">
              Notes pinned to the exact second
            </h3>
            <p className="mt-3.5 max-w-[525px] text-sm leading-[1.64] text-muted-foreground">
              Scrub to any moment, write a note, and it drops a marker on the
              timeline. Click it later to jump straight back — no more scrubbing
              to find that one explanation.
            </p>
            <NoteTimeline />
          </Card>

          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn("gap-0 p-6.5", index === 0 && "lg:min-h-[317px]")}
            >
              <FeatureIcon icon={feature.icon} />
              <h3 className="mt-3.5 text-base">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-[1.64] text-muted-foreground">
                {feature.body}
              </p>
            </Card>
          ))}
        </div>

        {/* 2 x 564px cards on a 22px gutter */}
        <div className="mt-16.5 grid gap-5.5 md:grid-cols-2">
          {audiences.map((audience) => (
            <Card key={audience.eyebrow} className="gap-0 p-6.5 sm:p-8.5">
              <Badge
                className={cn(
                  "h-[26px] px-3.5 text-[11px] font-bold tracking-[0.1em] uppercase",
                  audience.tint
                )}
              >
                {audience.eyebrow}
              </Badge>
              <h3 className="mt-4.5 text-[27px] font-extrabold tracking-[-0.02em]">
                {audience.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-muted-foreground">
                {audience.body}
              </p>
              <ul className="mt-6 flex flex-col gap-[15px]">
                {audience.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-px grid size-5 shrink-0 place-items-center rounded-full text-white",
                        audience.check
                      )}
                    >
                      <CheckIcon className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-[15px] leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
              <Button
                nativeButton={false}
                className={cn(
                  "mt-6 h-11 w-fit gap-2 px-5! font-semibold",
                  audience.cta.variant === "accent" &&
                    "bg-accent-1 text-white hover:bg-accent-1/85"
                )}
                render={<Link href={audience.cta.href} />}
              >
                {audience.cta.label}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export { PlatformSection }
