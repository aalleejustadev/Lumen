import { CatalogSection } from "@/components/marketing/catalog-section"
import { HeroSection } from "@/components/marketing/hero-section"
import { PlatformSection } from "@/components/marketing/platform-section"
import { PricingSection } from "@/components/marketing/pricing-section"
import { StatsSection } from "@/components/marketing/stats-section"
import { TestimonialsSection } from "@/components/marketing/testimonials-section"

export default function Page() {
  return (
    <main>
      <HeroSection />
      <StatsSection />
      <PlatformSection />
      <CatalogSection />
      <TestimonialsSection />
      <PricingSection />
    </main>
  )
}
