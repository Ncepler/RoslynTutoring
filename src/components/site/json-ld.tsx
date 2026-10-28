import { pricing, site } from "@/config/site";
import type { Catalog } from "@/lib/data/catalog";

/** Structured data so search engines understand who we are and what we offer. */
export function JsonLd({ catalog }: { catalog: Catalog }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: site.name,
    url: site.url,
    email: site.contactEmail,
    description: site.description,
    areaServed: { "@type": "Place", name: site.area },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tutoring",
      itemListElement: catalog.subjects.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: `${s.name} tutoring`, serviceType: "Online tutoring" },
        price: (pricing[30] / 100).toFixed(2),
        priceCurrency: "USD",
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
