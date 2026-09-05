import {
  BookOpenIcon,
  MailIcon,
  MessageCircleIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  initialsOf,
  type InstructorProfile,
} from "@/lib/config/instructor-profiles"

function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon
  value: string | number
  label: string
}) {
  return (
    <div className="flex flex-1 items-center gap-4 rounded-xl bg-soft p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-border">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold tracking-[-0.02em] tabular-nums">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/** The top card from `instructor-page__part1.png`: avatar, name, title,
 *  Follow/Message, then the four stat boxes. `Follow`/`Message` are
 *  decorative — there's no follow/messaging system yet, same as the sale
 *  page's `Wishlist`/`Share`. */
function InstructorHeaderCard({
  instructor,
}: {
  instructor: InstructorProfile
}) {
  return (
    <Card className="gap-0 p-8 ring-border">
      <div className="flex flex-wrap items-start gap-6">
        <Avatar className="size-26">
          <AvatarImage src={instructor.avatarUrl} alt="" />
          <AvatarFallback className="text-2xl">
            {initialsOf(instructor.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-[32px] leading-tight">{instructor.name}</h1>
          <p className="mt-1.5 text-muted-foreground">
            {instructor.title} · Teaching on Lumen since{" "}
            {instructor.teachingSince}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button className="gap-1.5 font-semibold shadow-sm">
              <PlusIcon data-icon="inline-start" className="size-4" />
              Follow
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 bg-card font-semibold shadow-sm"
            >
              <MailIcon data-icon="inline-start" className="size-4" />
              Message
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          icon={StarIcon}
          value={instructor.rating.toFixed(1)}
          label="Instructor rating"
        />
        <StatBox
          icon={MessageCircleIcon}
          value={instructor.reviewsCount.toLocaleString("en-US")}
          label="Reviews"
        />
        <StatBox
          icon={UsersIcon}
          value={instructor.studentsCount.toLocaleString("en-US")}
          label="Students"
        />
        <StatBox
          icon={BookOpenIcon}
          value={instructor.courses.length}
          label="Courses"
        />
      </div>
    </Card>
  )
}

export { InstructorHeaderCard }
