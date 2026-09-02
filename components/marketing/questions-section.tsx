import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { questions } from "@/lib/config/faq"
import { cn } from "@/lib/utils"

function QuestionsSection({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20">
        {/* 28px in the export — smaller than the other section headings */}
        <h2 className="text-center text-[28px] leading-[1.2]">
          Common questions
        </h2>

        {/* 770px panel, rows split by --border-subtle */}
        <Card className="mx-auto mt-8 max-w-[770px] gap-0 p-0 ring-border">
          {/* Base UI accordions are single-select by default and take arrays */}
          <Accordion defaultValue={[questions[0].id]}>
            {questions.map((entry) => (
              <AccordionItem
                key={entry.id}
                value={entry.id}
                className="px-6 not-last:border-b-border-subtle"
              >
                <AccordionTrigger className="cursor-pointer py-4 text-base font-semibold hover:no-underline **:data-[slot=accordion-trigger-icon]:mt-1">
                  {entry.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-[560px] pb-5 text-base leading-[1.53] text-muted-foreground">
                  {entry.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </section>
  )
}

export { QuestionsSection }
