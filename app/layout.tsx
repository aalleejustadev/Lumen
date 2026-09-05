import { Figtree, Geist_Mono } from "next/font/google"

import "./globals.css"
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
      className={cn(figtree.variable, fontMono.variable, "font-sans")}
    >
      <body>
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
