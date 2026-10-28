import { Hero } from "@/components/home/hero";
import { FaqTeaser, HowItWorks, SubjectsAndPricing, TutorsSection, UpcomingTests } from "@/components/home/sections";
import { JsonLd } from "@/components/site/json-ld";
import { getCatalog } from "@/lib/data/catalog";

export default async function HomePage() {
  const catalog = await getCatalog();
  return (
    <>
      <JsonLd catalog={catalog} />
      <Hero catalog={catalog} />
      <UpcomingTests catalog={catalog} />
      <HowItWorks />
      <TutorsSection catalog={catalog} />
      <SubjectsAndPricing catalog={catalog} />
      <FaqTeaser />
    </>
  );
}
