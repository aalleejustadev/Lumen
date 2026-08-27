import {
  AwardIcon,
  BookOpenIcon,
  CircleCheckIcon,
  CompassIcon,
  FlameIcon,
  GraduationCapIcon,
  HeartIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  PaletteIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { LogoMark } from "@/components/shared/logo"
import { cn } from "@/lib/utils"

const sidebarNav = [
  { title: "Dashboard", icon: LayoutDashboardIcon, active: true },
  { title: "Browse Courses", icon: CompassIcon },
  { title: "My Learning", icon: GraduationCapIcon },
  { title: "Wishlist", icon: HeartIcon, count: 6 },
  { title: "Certificates", icon: AwardIcon },
  { title: "Discussions", icon: MessagesSquareIcon, count: 12 },
]

// Progress paints its own track and indicator, so the per-course colour is
// written out in full here — Tailwind only sees classes that exist as literals.
const courses = [
  {
    title: "Mastering Illustration",
    value: 68,
    bar: "[&_[data-slot=progress-indicator]]:bg-accent-1",
    art: "from-accent-1 to-accent-2",
    icon: PaletteIcon,
  },
  {
    title: "Python for Everybody",
    value: 42,
    bar: "[&_[data-slot=progress-indicator]]:bg-accent-2",
    art: "from-warning to-star",
    icon: BookOpenIcon,
  },
  {
    title: "The Complete React Bootcamp",
    value: 91,
    bar: "[&_[data-slot=progress-indicator]]:bg-success",
    art: "from-accent-3 to-accent-2",
    icon: GraduationCapIcon,
  },
]

const stats = [
  { label: "Enrolled", value: "14", icon: BookOpenIcon, tone: "text-accent-2" },
  {
    label: "Completed",
    value: "9",
    icon: CircleCheckIcon,
    tone: "text-success",
  },
  { label: "Certificates", value: "4", icon: AwardIcon, tone: "text-accent-1" },
  { label: "Day streak", value: "31", icon: FlameIcon, tone: "text-warning" },
]

const activity = [
  { day: "M", height: "h-4" },
  { day: "T", height: "h-7" },
  { day: "W", height: "h-3" },
  { day: "T", height: "h-12", today: true },
  { day: "F", height: "h-6" },
  { day: "S", height: "h-2.5" },
  { day: "S", height: "h-3.5" },
]

// `start` is the cumulative offset of each arc — stated rather than
// accumulated during render, which the react-compiler lint rightly rejects.
const goalArcs = [
  { pct: 0.34, start: 0, color: "var(--accent-1)" },
  { pct: 0.24, start: 0.34, color: "var(--accent-2)" },
  { pct: 0.14, start: 0.58, color: "var(--accent-3)" },
]

/**
 * Weekly-goal donut. Three arcs on one circle, offset by dash length. The
 * Chart component would be the reach here, but it pulls Recharts and a
 * client boundary into the landing page for what is a still image.
 */
function WeeklyGoalDonut() {
  const radius = 52
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 130 130" className="size-32 -rotate-90">
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth="14"
        />
        {goalArcs.map((arc) => (
          <circle
            key={arc.color}
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${circumference * arc.pct} ${circumference}`}
            strokeDashoffset={-circumference * arc.start}
          />
        ))}
      </svg>
      <div className="absolute grid place-items-center">
        <span className="stat-figure text-2xl">72%</span>
        <span className="text-[11px] text-muted-foreground">of 5 hrs</span>
      </div>
    </div>
  )
}

function HeroAppPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1078px] overflow-hidden rounded-2xl border bg-card shadow-modal",
        className
      )}
    >
      {/* browser chrome */}
      <div className="flex h-13 items-center gap-4 border-b px-5">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-destructive" />
          <span className="size-3 rounded-full bg-star" />
          <span className="size-3 rounded-full bg-success" />
        </div>
        <div className="mx-auto flex h-8 items-center gap-2 rounded-lg bg-soft px-3 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-success" />
          app.lumen.co/overview
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden w-[215px] shrink-0 flex-col gap-4 border-r bg-sidebar p-4 md:flex">
          <div className="flex items-center gap-2.5 px-1 pt-1">
            <LogoMark className="size-7" />
            <span className="font-extrabold tracking-[-0.03em]">Lumen</span>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-track p-1 text-xs font-semibold">
            <span className="rounded-md bg-card py-1.5 text-center shadow-sm">
              Student
            </span>
            <span className="py-1.5 text-center text-muted-foreground">
              Instructor
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
              Learn
            </span>
            {sidebarNav.map((item) => (
              <span
                key={item.title}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium text-muted-foreground",
                  item.active &&
                    "bg-card font-semibold text-foreground shadow-sm"
                )}
              >
                <item.icon className="size-4" />
                {item.title}
                {item.count ? (
                  <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px]">
                    {item.count}
                  </Badge>
                ) : null}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
            <Avatar size="sm">
              <AvatarFallback className="text-[10px]">AL</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">
                Ada Lovelace
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                ada@lumen.co
              </span>
            </div>
          </div>
        </aside>

        {/* canvas */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 bg-background p-5">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold tracking-[-0.02em]">Overview</h3>
            <Badge variant="outline" className="gap-1.5 bg-card">
              <span className="size-1.5 rounded-full bg-accent-2" />
              Student mode
            </Badge>
            <div className="ml-auto hidden h-8 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs text-muted-foreground sm:flex">
              <SearchIcon className="size-3.5" />
              Search
              <Kbd className="ml-2">⌘K</Kbd>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Continue learning</CardTitle>
                <CardAction className="text-xs text-muted-foreground">
                  3 in progress
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col">
                {courses.map((course, index) => (
                  <div key={course.title} className="flex flex-col">
                    {index > 0 ? (
                      <Separator className="bg-border-subtle" />
                    ) : null}
                    <div className="flex items-center gap-3 py-2.5">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white",
                          course.art
                        )}
                      >
                        <course.icon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="truncate text-[13px] font-medium">
                          {course.title}
                        </span>
                        <Progress
                          value={course.value}
                          className={cn(
                            "[&_[data-slot=progress-track]]:bg-track",
                            course.bar
                          )}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums">
                        {course.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weekly goal</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <WeeklyGoalDonut />
                <div className="flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
                  {[
                    { label: "Video", dot: "bg-accent-1" },
                    { label: "Reading", dot: "bg-accent-2" },
                    { label: "Quiz", dot: "bg-accent-3" },
                  ].map((legend) => (
                    <span
                      key={legend.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className={cn("size-1.5 rounded-full", legend.dot)}
                      />
                      {legend.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <stat.icon className={cn("size-4", stat.tone)} />
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="stat-figure text-2xl">{stat.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity this week</CardTitle>
              <CardAction className="text-xs font-semibold text-success">
                +18%
              </CardAction>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-2">
              {activity.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      "w-full max-w-6 rounded-md bg-track",
                      entry.height,
                      entry.today && "bg-accent-1"
                    )}
                  />
                  <span className="text-[10px] text-subtle-foreground">
                    {entry.day}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { HeroAppPreview }
