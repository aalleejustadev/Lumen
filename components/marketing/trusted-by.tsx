import { cn } from "@/lib/utils"

const companies = [
  "Northwind",
  "Aperture",
  "Ridgeline",
  "Fieldwork",
  "Kōbi",
  "Halcyon",
]

function TrustedBy({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <p className="text-xs font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
        Trusted by teams learning at
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {companies.map((company) => (
          <li
            key={company}
            className="text-xl font-bold tracking-[-0.02em] text-muted-foreground"
          >
            {company}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { TrustedBy }
