"use client"

import * as React from "react"
import Link from "next/link"
import { GraduationCapIcon, RocketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { CurriculumBoard } from "@/components/dashboard/instructor/courses/edit/curriculum-board"
import { IntendedLearnersForm } from "@/components/dashboard/instructor/courses/edit/intended-learners-form"
import {
  LandingPageForm,
  type LandingValues,
} from "@/components/dashboard/instructor/courses/edit/landing-page-form"
import {
  PricingForm,
  type PricingValues,
} from "@/components/dashboard/instructor/courses/edit/pricing-form"
import { CouponsStep } from "@/components/dashboard/instructor/courses/edit/coupons-step"
import {
  CourseMessagesForm,
  type MessagesValues,
} from "@/components/dashboard/instructor/courses/edit/course-messages-form"
import {
  courseEditorCopy,
  publishCopy,
  type EditorStepKey,
} from "@/lib/config/course-editor"
import { courseStatusBadge } from "@/lib/config/course-status"
import type { EditorCourse } from "@/lib/instructor-course-edit"
import type { CourseCoupons } from "@/lib/instructor-coupons"
import {
  publishCourse,
  saveIntendedLearners,
  saveCourseMessages,
  saveLandingPage,
  savePricing,
} from "@/lib/actions/instructor-course-edit"

/**
 * `/dashboard/instructor/courses/[slug]/edit/[step]` — the course editor both
 * "Create Course" exports draw.
 *
 * Measured off them at DPR 2: the instructor shell's usual 32px page inset, a
 * 28px/800 title over a 15px muted "<course> · <status>" line with two 42px
 * buttons right-aligned on a 10px gap, then a grid of a **238px** nav card, a
 * 26px gutter and a fluid content column. The nav arrives as `children` so it
 * stays a Server Component — the arrangement `community-page.tsx` uses for its
 * stat row, and what keeps the six-step config and its glyphs off this bundle.
 *
 * **This component owns the state of every form step** — Intended learners,
 * Course landing page and Pricing — which is why those forms are controlled
 * rather than self-contained: each export puts *Save draft* in the page header
 * and its own submit in the card, two buttons over one set of values, and one
 * owner is what stops them disagreeing about what is pending. *Save draft*
 * saves **the step that is open** and nothing else; the other steps' values are
 * whatever the server last returned. On the Curriculum step there is no form —
 * everything there writes as it is edited — and on Coupons, where each code is
 * written when it is created, *Save draft* renders inert with the reason rather
 * than pretending to submit something.
 *
 * **Publish is "submit for review"** and is confirmed, because it hands the
 * course to somebody else: the console's queue at `/dashboard/admin/courses`
 * decides whether it goes on sale. See `publishCopy`. It is inert in every
 * status that cannot be submitted, with the reason on it — the treatment
 * `user-row-actions.tsx` gives "View profile" for a learner.
 */
function CourseEditorPage({
  course,
  step,
  nav,
  previewHref,
  coupons,
}: {
  course: EditorCourse
  step: EditorStepKey
  nav: React.ReactNode
  /** *Preview as student*, returning to this step — built by the route. */
  previewHref: string
  /** The Coupons step's data, read by the route only on that step. */
  coupons: CourseCoupons | null
}) {
  const [values, setValues] = React.useState({
    learningOutcomes: course.learningOutcomes,
    requirements: course.requirements,
    intendedAudience: course.intendedAudience,
  })
  const [landing, setLanding] = React.useState<LandingValues>({
    title: course.landing.title,
    subtitle: course.landing.subtitle,
    description: course.landing.description,
  })
  const [pricing, setPricing] = React.useState<PricingValues>({
    currency: course.pricing.currency,
    listPriceCents: course.pricing.listPriceCents,
    includedInBusiness: course.pricing.includedInBusiness,
  })
  const [saving, startSaving] = React.useTransition()
  const [publishing, startPublishing] = React.useTransition()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const badge = courseStatusBadge(course.status)
  const canSubmit =
    course.status === "DRAFT" || course.status === "NEEDS_CHANGES"
  const publishReason = publishCopy.unavailable[course.status]
  const [messages, setMessages] = React.useState<MessagesValues>({
    welcomeMessage: course.messages.welcomeMessage,
    congratulationsMessage: course.messages.congratulationsMessage,
  })
  const saveDraftReason = courseEditorCopy.saveDraftUnavailable[step]
  const hasForm = saveDraftReason === undefined

  function save() {
    if (!hasForm) return
    startSaving(async () => {
      const result =
        step === "landing-page"
          ? await saveLandingPage(course.id, landing)
          : step === "pricing"
            ? await savePricing(course.id, pricing)
            : step === "messages"
              ? await saveCourseMessages(course.id, messages)
              : await saveIntendedLearners(course.id, values)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  function submitForReview() {
    startPublishing(async () => {
      const result = await publishCourse(course.id)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setConfirmOpen(false)
    })
  }

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          {/* `font-extrabold` explicitly: this is a display title in the
              export's own weight, unlike the 700 the dashboard's page titles
              measure — see the design note in `CLAUDE.md`. */}
          <h1 className="text-[28px] leading-none font-extrabold">
            {courseEditorCopy.title}
          </h1>
          <p className="mt-2.5 truncate text-[15px] text-muted-foreground">
            {course.title} · {badge.label}
          </p>
        </div>

        {/* Not `shrink-0`: with three buttons the group is wider than a phone,
            and a flex item that cannot shrink cannot wrap its own children
            either — it pushed the page 24px wide at 400px. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={!hasForm}
            loading={hasForm && saving}
            title={saveDraftReason}
            onClick={save}
            className="h-[42px] bg-card px-4 text-[14px] shadow-sm"
          >
            {courseEditorCopy.saveDraft}
          </Button>

          {/* Not in any of the six exports. It is here because checking how a
              change reads to a learner is part of editing, and the only other
              way in was the manage page — which a draft never reaches. It
              returns to this exact step: see `previewAsStudentHref`. */}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={previewHref} />}
            className="h-[42px] gap-2 bg-card px-4 text-[14px] shadow-sm"
          >
            <GraduationCapIcon className="size-4" />
            {courseEditorCopy.preview}
          </Button>

          <Button
            type="button"
            disabled={!canSubmit}
            title={publishReason}
            onClick={() => setConfirmOpen(true)}
            className="h-[42px] gap-2 px-4 text-[14px]"
          >
            <RocketIcon className="size-4" />
            {courseEditorCopy.publish}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-[26px] lg:grid-cols-[238px_minmax(0,1fr)] lg:items-start">
        {nav}

        <div className="min-w-0">
          {step === "curriculum" ? (
            <CurriculumBoard
              courseId={course.id}
              courseSlug={course.slug}
              sections={course.sections}
            />
          ) : step === "landing-page" ? (
            <LandingPageForm
              courseId={course.id}
              landing={course.landing}
              values={landing}
              pending={saving}
              onChange={(next) =>
                setLanding((current) => ({ ...current, ...next }))
              }
              onSubmit={save}
            />
          ) : step === "coupons" && coupons ? (
            <CouponsStep courseId={course.id} data={coupons} />
          ) : step === "messages" ? (
            <CourseMessagesForm
              values={messages}
              pending={saving}
              onChange={(next) =>
                setMessages((current) => ({ ...current, ...next }))
              }
              onSubmit={save}
            />
          ) : step === "pricing" ? (
            <PricingForm
              courseId={course.id}
              pricing={course.pricing}
              values={pricing}
              pending={saving}
              onChange={(next) =>
                setPricing((current) => ({ ...current, ...next }))
              }
              onSubmit={save}
            />
          ) : (
            <IntendedLearnersForm
              values={values}
              pending={saving}
              onChange={(next) =>
                setValues((current) => ({ ...current, ...next }))
              }
              onSubmit={save}
            />
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {/* `maintenance-dialog.tsx`' geometry, reused rather than re-derived.
            No Cancel, per the standing rule: `DialogContent` already draws a
            close X. */}
        <DialogContent className="w-[440px] gap-0 p-7.5 sm:max-w-[440px]">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl font-bold">
              {publishCopy.title}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-6">
              {publishCopy.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Button
              type="button"
              loading={publishing}
              onClick={submitForReview}
              className="h-11 px-5"
            >
              {publishCopy.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export { CourseEditorPage }
