import Link from "next/link"
import { ArrowRightIcon, ChevronRightIcon, StarIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { HeroAppPreview } from "@/components/marketing/hero-app-preview"
import { HeroBackdrop } from "@/components/marketing/hero-backdrop"
import { TrustedBy } from "@/components/marketing/trusted-by"

const learners = [
  { name: "Amara Osei", src: "/avatars/learner-1.png" },
  { name: "Jonas Reyes", src: "/avatars/learner-2.png" },
  { name: "Sofia Kaur", src: "/avatars/learner-3.png" },
  { name: "Tomas Neri", src: "/avatars/learner-4.png" },
]

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 py-20">
        <Link
          href="/changelog"
          className="group flex items-center gap-2 rounded-full border bg-card py-1.5 pr-2.5 pl-1.5 shadow-sm transition-colors hover:bg-hover"
        >
          <span className="bg-logo rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-white">
            NEW
          </span>
          <span className="text-sm text-muted-foreground">
            Instructor payouts now run monthly
          </span>
          <ChevronRightIcon className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* 72px display type on a 72px line in the export; weight, tracking
            and colour all come from the base h1 rule in globals.css */}
        <h1 className="mt-8 text-center text-5xl leading-[0.97] sm:text-6xl lg:text-[4.5rem]">
          Learn anything.
          <br />
          <span className="text-gradient">Teach everything.</span>
        </h1>

        <p className="mt-7 max-w-[672px] text-center text-[19px] leading-[1.66] text-muted-foreground">
          One platform for both sides of the classroom — 12,000 courses to learn
          from, and everything you need to build and sell your own.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            nativeButton={false}
            className="h-13 gap-2 px-6! text-[15px] font-semibold"
            render={<Link href="/register" />}
          >
            Start learning free
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            className="h-13 bg-card px-6 text-[15px] font-semibold"
            render={<Link href="/teach" />}
          >
            Become an instructor
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <AvatarGroup className="-space-x-1.5">
            {learners.map((learner) => (
              <Avatar key={learner.name} size="sm">
                <AvatarImage src={learner.src} alt={learner.name} />
                <AvatarFallback className="bg-hover text-[10px] font-semibold">
                  {learner.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <div className="flex gap-0.5 text-star">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon key={index} className="size-3.5 fill-current" />
            ))}
          </div>
          <p className="text-[15px] text-muted-foreground">
            4.8 from 28,000+ learners
          </p>
        </div>

        <HeroAppPreview className="mt-18 animate-floaty" />

        <TrustedBy className="mt-20" />
      </div>
    </section>
  )
}

export { HeroSection }
