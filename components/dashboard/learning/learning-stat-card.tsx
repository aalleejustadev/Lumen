import { Card } from "@/components/ui/card"
import type { LearningStat } from "@/lib/config/my-learning"

/**
 * One tile from the four-up row at the top of `my-learning-page.png`: a
 * 44px icon square, the figure, and its label.
 *
 * Same anatomy as `instructor-header-card.tsx`'s `StatBox`, inverted — there
 * the box is `bg-soft` on a white card and the tile is `bg-card`; here the
 * tile is the tinted one because the box *is* the card. `bg-hover` is the
 * token that matches the export's fill exactly (`--soft` is near-white, so
 * it would vanish against `bg-card`).
 */
function LearningStatCard({ icon: Icon, value, label }: LearningStat) {
  return (
    <Card className="flex-row items-center gap-4 p-5 ring-border">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-hover">
        <Icon className="size-5" />
      </div>
      {/* The two lines are pulled in to 28px + 16px so the text block lands
          at exactly 44px and the tile — not the type — sets the card's
          height, which is what gives the export its 82px row. Left at the
          default leadings the block is 52px and the row grows 12px. */}
      <div>
        <p className="text-2xl leading-7 font-extrabold tracking-[-0.02em] tabular-nums">
          {value}
        </p>
        <p className="text-sm leading-4 text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}

export { LearningStatCard }
