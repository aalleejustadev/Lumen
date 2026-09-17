import { Suspense } from "react"
import { Figtree, Geist_Mono, Lora } from "next/font/google"

import "./globals.css"
import { NavigationProgress } from "@/components/shared/navigation-progress"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// Figtree is variable (wght 300-900), so no `weight` is needed — the whole
// 400-800 range the design system uses ships in a single file.
const figtree = Figtree({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-figtree",
  display: "swap",
})

/**
 * The one serif in the app, and it has exactly one job: the printed
 * certificate at `/certificates/[slug]`, whose export
 * (`ui-design/light/dashboard/student/certificate.png`) sets its title and the
 * holder's name in a display serif with a true cursive italic. Figtree has no
 * serif and the CSS generic would render Times, which on a credential reads as
 * a word-processor document rather than as a document.
 *
 * Lora rather than one of the narrower text serifs, and that was **measured
 * rather than guessed**: the export's title sets "Certificate of Completion"
 * 561.5px wide against 41px of ink, a width-to-ink ratio of 13.7, where Source
 * Serif 4 — the first choice — came out at 12.3. Lora is the wider face with
 * the same ball terminals and a genuinely cursive italic, and it lands on the
 * drawn proportions. It is still a close match rather than a confirmed
 * identification.
 *
 * It is variable across 400–700 and carries a real italic, so the whole
 * certificate ships in two files. Nothing else in the app uses `font-serif`;
 * if a second surface ever wants one, this is the family it gets.
 */
const fontSerif = Lora({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        figtree.variable,
        fontSerif.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <body>
        {/* Same reasoning as `Toaster`: app-wide chrome, not a surface's.
            The `Suspense` boundary is required — `NavigationProgress` reads
            `useSearchParams()`, which without one would opt every route in
            this layout into client-side rendering. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* `Toaster` is app-wide infrastructure like `ThemeProvider`, not
            surface chrome, so it belongs here rather than in a route group's
            layout. It sits beside `children` rather than wrapping them:
            `toast` is a module-level manager (`createToastManager()` in
            `components/ui/toast.tsx`), so callers don't need to be inside the
            provider — only the viewport does. */}
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
