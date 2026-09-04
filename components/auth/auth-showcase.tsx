import { CheckIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const proofPoints = [
  "12,000 courses across 10 categories",
  "Notes pinned to the exact second",
  "Certificates you can verify",
]

const quote = {
  body: "I have started fifteen online courses in my life and finished two of them — both on Lumen.",
  name: "Nadia Rahman",
  role: "Product designer",
  avatar: "/avatars/learner-1.png",
}

/**
 * The gradient half of the auth screens. The stops are the CTA panel's, run on
 * the diagonal — violet at the top-left corner, cyan at the bottom-right, with
 * the blue midpoint dead centre — so it doesn't flip with the theme. Hidden
 * below lg, where the form takes the whole viewport.
 *
 * The content is a 440px column inset 48px from the panel's left edge and
 * centred vertically, both measured off the export.
 */
function AuthShowcase() {
  return (
    <aside className="relative hidden overflow-hidden bg-[image:var(--gradient-auth)] lg:flex lg:items-center">
      <div className="w-full max-w-[536px] px-12 py-16 text-white">
        <p className="text-[13px] font-semibold tracking-[0.14em] text-white/70 uppercase">
          For learners
        </p>
        {/* `text-wrap` overrides the global `pretty`, which pulls "actually"
            onto the second line to avoid a short last line. The export wraps
            greedily — "…people actually / finish." — so opt out here. */}
        <h2 className="mt-3 text-[32px] leading-10 [text-wrap:wrap] text-white">
          The platform people actually finish.
        </h2>

        <ul className="mt-9 flex flex-col gap-4">
          {proofPoints.map((point) => (
            <li key={point} className="flex items-center gap-3.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/25">
                <CheckIcon className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-[15px] text-white/95">{point}</span>
            </li>
          ))}
        </ul>

        {/* Frosted, not solid: the gradient has to read through it. */}
        <figure className="mt-12 rounded-2xl bg-white/12 p-6 backdrop-blur-sm">
          <blockquote className="text-[15px] leading-[1.65] text-white/95">
            &ldquo;{quote.body}&rdquo;
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <Avatar className="size-10 ring-2 ring-white/30">
              <AvatarImage src={quote.avatar} alt="" />
              <AvatarFallback className="bg-white/20 text-xs text-white">
                NR
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col">
              <span className="text-sm font-bold">{quote.name}</span>
              <span className="text-sm text-white/70">{quote.role}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </aside>
  )
}

export { AuthShowcase }
