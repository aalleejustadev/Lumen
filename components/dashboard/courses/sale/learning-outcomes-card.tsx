import { CheckIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

function LearningOutcomesCard({ outcomes }: { outcomes: string[] }) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-lg">What you&apos;ll learn</h2>
      <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-3">
        {outcomes.map((outcome) => (
          <div key={outcome} className="flex items-start gap-2.5 text-sm">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{outcome}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export { LearningOutcomesCard }
