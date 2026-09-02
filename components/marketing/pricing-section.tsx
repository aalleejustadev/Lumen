"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { plans, type BillingPeriod } from "@/lib/config/pricing"
import { cn } from "@/lib/utils"

const periods: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

function PricingSection({ className }: { className?: string }) {
  const [period, setPeriod] = React.useState<BillingPeriod>("monthly")

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20">
        <h2 className="text-center text-4xl leading-[1.1] lg:text-[44px]">
          Pay per course, or unlock everything.
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-lg leading-[1.5] tracking-[-0.01em] text-muted-foreground">
          Teaching on Lumen is always free — you only share revenue when you
          earn.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {/* 194x47 track with a 94x36 pill, per the export */}
          <ToggleGroup
            spacing={0}
            value={[period]}
            onValueChange={(value: string[]) => {
              if (value[0]) setPeriod(value[0] as BillingPeriod)
            }}
            aria-label="Billing period"
            className="h-[47px] rounded-full bg-track p-1.5"
          >
            {periods.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-[35px] w-[94px] cursor-pointer rounded-full! text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Badge className="h-[27px] bg-success/15 px-3 text-[13px] font-semibold text-success">
            Save 14% yearly
          </Badge>
        </div>

        {/* Cards are content-height and top-aligned, not stretched */}
        <div className="mt-10 grid items-start gap-5.25 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                // Card rings at foreground/10; the export uses --border
                "relative gap-0 p-7.5 ring-border",
                plan.featured &&
                  "overflow-visible border-2 border-accent-1 shadow-[0_24px_70px_-28px_var(--accent-1)] ring-0"
              )}
            >
              {plan.featured ? (
                <Badge className="bg-logo absolute -top-3 left-3 h-6 px-3 text-[11px] font-bold tracking-[0.08em] text-white uppercase">
                  Most popular
                </Badge>
              ) : null}

              <h3 className="text-[17px]">{plan.name}</h3>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[38px] leading-none font-extrabold tracking-[-0.03em]">
                  {plan.price[period]}
                </span>
                <span className="text-[15px] text-muted-foreground">
                  {plan.suffix[period]}
                </span>
              </p>
              <p className="mt-3.5 text-[15px] leading-[1.55] text-muted-foreground">
                {plan.description}
              </p>

              <ul className="mt-6 flex flex-col gap-[11px]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.featured ? "default" : "outline"}
                nativeButton={false}
                className={cn(
                  "mt-[22px] h-[45px] w-full font-semibold",
                  !plan.featured && "bg-card"
                )}
                render={<Link href={plan.cta.href} />}
              >
                {plan.cta.label}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export { PricingSection }
