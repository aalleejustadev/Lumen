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
 * **It is deliberately not a link.** There is no article model and no
 * `/dashboard/instructor/help/[topic]` route, and the export draws no chevron
 * or other affordance on these cards — so they read as the flat informational
 * blocks they are rather than promising a page that would 404, the rule the
 * inert sidebar rows follow. `HelpTopic.articles` documents what changes when
 * the articles land.
 *
 * `mt-auto` on the count keeps it on the card's bottom edge: every
 * description in the export happens to run to two lines, so the column would
 * look identical without it right up until one of them wrapped to three.
 */
function HelpTopicCard({ topic }: { topic: HelpTopic }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-5.5">
      <div className="grid size-10.5 place-items-center rounded-lg bg-hover">
        <topic.icon className="size-4.5" />
      </div>
      <h3 className="mt-4 text-base leading-none">{topic.title}</h3>
      <p className="mt-2.5 text-sm leading-[21px] text-muted-foreground">
        {topic.description}
      </p>
      <p className="mt-auto pt-3 text-[13px] leading-none text-subtle-foreground">
        {instructorHelpCopy.articles(topic.articles)}
      </p>
    </div>
  )
}

export { HelpTopicCard }
