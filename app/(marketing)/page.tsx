import { CatalogSection } from "@/components/marketing/catalog-section"
import { CtaSection } from "@/components/marketing/cta-section"
import { HeroSection } from "@/components/marketing/hero-section"
import { PlatformSection } from "@/components/marketing/platform-section"
import { PricingSection } from "@/components/marketing/pricing-section"
import { getBusinessOffer } from "@/lib/subscription"
import { QuestionsSection } from "@/components/marketing/questions-section"
import { StatsSection } from "@/components/marketing/stats-section"
import { TestimonialsSection } from "@/components/marketing/testimonials-section"

export default async function Page() {
  const offer = await getBusinessOffer()

  return (
    <main>
      <HeroSection />
      <StatsSection />
      <PlatformSection />
      <CatalogSection />
      <TestimonialsSection />
      <PricingSection offer={offer} />
      <QuestionsSection />
      <CtaSection />
    </main>
  )
}
