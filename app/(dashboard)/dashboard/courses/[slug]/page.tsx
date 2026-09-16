import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CourseSalePage } from "@/components/dashboard/courses/sale/course-sale-page"
import { getSaleCourse } from "@/lib/course-sale"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const sale = await getSaleCourse(slug)
  return {
    title: sale ? `${sale.course.title} · ${siteConfig.name}` : siteConfig.name,
  }
}

/**
 * The course sale page, built against
 * `ui-design/light/dashboard/student/course-sale-page-part-{1,2}.png`.
 * Reads `lib/config/course-details.ts` — see that file's header for why.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // The static catalog first, then a published database course (or a draft,
  // for its own instructor) — see `lib/course-sale.ts`.
  const sale = await getSaleCourse(slug)
  if (!sale) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CourseSalePage
        course={sale.course}
        previews={sale.previews}
        purchasable={sale.purchasable}
      />
    </main>
  )
}
