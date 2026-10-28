import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { FaqList } from "@/components/site/faq-list";
import { PageIntro } from "@/components/site/page-intro";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Pricing, Zoom sessions, cancellations, parents and who the tutors are: answers about ${site.school} student tutoring.`,
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      <PageIntro title="Questions and answers" lead="If yours isn't here, email us and one of the founders will get back to you." />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
        <FaqList items={FAQ} />
        <p className="mt-10 text-ink-2">
          Still wondering about something? Write to{" "}
          <a href={`mailto:${site.contactEmail}`} className="link">
            {site.contactEmail}
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="link">
            contact page
          </Link>
          .
        </p>
      </section>
    </>
  );
}
