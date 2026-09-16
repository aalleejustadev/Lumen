"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  editorStepHref,
  FIRST_STEP,
  newCourseCopy,
} from "@/lib/config/course-editor"
import { createCourse } from "@/lib/actions/instructor-course-edit"

/**
 * `/dashboard/instructor/courses/new` — where the sidebar's **Create Course**
 * row goes.
 *
 * **The one screen here with no export.** It is built to the vocabulary of the
 * editor it leads into — a 720px card on 28px padding, 44px `--background`
 * fields, a 40px submit — rather than invented: the same borrowing
 * `payout-method-dialog.tsx` does from `new-category__dialog_admin.png`.
 *
 * On success it goes straight to the editor's first step rather than back to
 * My Courses, because creating a course and then being shown a list is not
 * what the button promised.
 */
function NewCourseForm({
  categories,
}: {
  categories: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "")
  const [pending, startTransition] = React.useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createCourse({ title, categoryId })
      if (!result.ok || !result.slug) {
        toast.add({ title: result.message, type: "error" })
        return
      }
      router.push(editorStepHref(result.slug, FIRST_STEP))
    })
  }

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/instructor/courses"
        className="inline-flex items-center gap-2 text-[14px] leading-none text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {newCourseCopy.back}
      </Link>

      <h1 className="mt-4 text-[28px] leading-none font-extrabold">
        {newCourseCopy.title}
      </h1>
      <p className="mt-2.5 max-w-[620px] text-[15px] text-muted-foreground">
        {newCourseCopy.lead}
      </p>

      <Card className="mt-6 max-w-[720px] gap-0 p-7 ring-border">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <label htmlFor="course-title" className="block text-[16px] font-bold">
            {newCourseCopy.name.label}
          </label>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {newCourseCopy.name.help}
          </p>
          <input
            id="course-title"
            value={title}
            autoFocus
            maxLength={200}
            disabled={pending}
            placeholder={newCourseCopy.name.placeholder}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2.5 h-11 w-full rounded-lg bg-background px-3.5 text-[15px] ring-1 ring-transparent transition-shadow outline-none placeholder:text-subtle-foreground focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 md:text-[15px] dark:bg-background"
          />

          <p className="mt-7 text-[16px] font-bold">
            {newCourseCopy.category.label}
          </p>
          <Select
            value={categoryId}
            onValueChange={(value) => setCategoryId(value ?? "")}
          >
            {/* `data-[size=default]:h-11` repeats the variant on purpose:
                `SelectTrigger`'s own `data-[size=default]:h-8` is an attribute
                selector that beats a plain `h-11` on specificity — the trap
                `account-form.tsx` records. */}
            <SelectTrigger
              disabled={pending}
              className="mt-2.5 w-full bg-background text-[15px] ring-1 ring-transparent data-[size=default]:h-11 dark:bg-background"
            >
              {/* A render function, not a bare `SelectValue`: Base UI's
                  `Select.Value` prints the raw *value* unless it is told how
                  to label one, so the trigger showed the category's cuid.
                  The trap `new-discussion-dialog.tsx` already records. */}
              <SelectValue placeholder={newCourseCopy.category.placeholder}>
                {(current: string) =>
                  categories.find((category) => category.id === current)
                    ?.name ?? newCourseCopy.category.placeholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            loading={pending}
            disabled={title.trim() === "" || categoryId === ""}
            className="mt-7 h-10 px-5"
          >
            {newCourseCopy.submit}
          </Button>
        </form>
      </Card>
    </main>
  )
}

export { NewCourseForm }
