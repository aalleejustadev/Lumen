import { Card } from "@/components/ui/card"

/** Requirements + Description share one card in the export — no divider
 *  between them, just spacing — see the AGENTS.md note on this file. */
function CourseAboutCard({
  requirements,
  description,
}: {
  requirements: string[]
  description: string[]
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-lg">Requirements</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {requirements.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg">Description</h2>
      <div className="mt-4 flex flex-col gap-4 text-sm text-muted-foreground">
        {description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </Card>
  )
}

export { CourseAboutCard }
