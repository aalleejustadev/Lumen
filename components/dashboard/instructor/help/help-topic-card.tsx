import Link from "next/link"

import {
  instructorHelpCopy,
  type HelpTopic,
} from "@/lib/config/instructor-help"

/**
 * One card in "Browse by topic".
 *
 * Measured off `instructor-help-center-page.png` at DPR 2: a 322px card on a
 * **22px** padding (`p-5.5`, not the 24px the two cards at the foot of the
 * page use — the export really does differ by 2px between the two blocks), a
 * 42px `--hover` tile with an 18px glyph, a 16px/700 title, a 14px/21 muted
 * description and a 13px `--subtle-foreground` count.
 *
 * The title is a plain `h3`, which `globals.css` already sets to 700 —
 * measured at 0.156em here, and the standing note says not to add
 * `font-semibold` to a card title.
 *
 * **It is a link now that the articles exist**, which is what the earlier note
 * here said would happen. It opens the topic's first article rather than a
 * topic index: there is no export for a topic page, and the article's rail
 * lists its siblings, so the rest of the topic is one click away. Build
 * `/dashboard/instructor/help/topic/[slug]` if a topic ever holds enough
 * articles for that to feel thin — nothing else has to change.
 *
 * `count` and `href` are passed in rather than read off `topic`, so this card
 * stays ignorant of where the articles live — the composer resolves both.
 *
 * `mt-auto` on the count keeps it on the card's bottom edge: every
 * description in the export happens to run to two lines, so the column would
 * look identical without it right up until one of them wrapped to three.
 */
function HelpTopicCard({
  topic,
  href,
  count,
}: {
  topic: HelpTopic
  href: string
  count: number
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border bg-card p-5.5 transition-colors hover:bg-hover"
    >
      <div className="grid size-10.5 place-items-center rounded-lg bg-hover">
        <topic.icon className="size-4.5" />
      </div>
      <h3 className="mt-4 text-base leading-none">{topic.title}</h3>
      <p className="mt-2.5 text-sm leading-[21px] text-muted-foreground">
        {topic.description}
      </p>
      <p className="mt-auto pt-3 text-[13px] leading-none text-subtle-foreground">
        {instructorHelpCopy.articles(count)}
      </p>
    </Link>
  )
}

export { HelpTopicCard }
