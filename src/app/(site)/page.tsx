import { Hero } from "@/components/home/hero";
import {
  ClosingCta,
  FaqTeaser,
  HowItWorks,
  PricingSection,
  SubjectsSection,
  TutorsSection,
  UpcomingTests,
} from "@/components/home/sections";
import { JsonLd } from "@/components/site/json-ld";
import { getCatalog } from "@/lib/data/catalog";

export default async function HomePage() {
  const catalog = await getCatalog();
  return (
    <>
      <JsonLd catalog={catalog} />
      <Hero catalog={catalog} />
      <UpcomingTests catalog={catalog} />
      <TutorsSection catalog={catalog} />
      <SubjectsSection catalog={catalog} />
      <PricingSection />
      <HowItWorks />
      <FaqTeaser />
      <ClosingCta />
    </>
  );
}
