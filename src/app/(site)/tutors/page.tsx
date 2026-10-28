import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { ArrowRight } from "@/components/icons";
import { PageIntro } from "@/components/site/page-intro";
import { TutorCard } from "@/components/site/tutor-card";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Tutors",
  description: `Meet the ${site.school} students who tutor every session: their grades and the subjects they teach.`,
  alternates: { canonical: "/tutors" },
};

export default async function TutorsPage() {
  const catalog = await getCatalog();
  return (
    <>
      <PageIntro
        title="The tutors"
        lead={`Every session is taught by one of the founders: ${site.school} students who have each earned many 100s on Regents exams. When you book, you're matched with whoever teaches your subject and is free at your time.`}
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {catalog.tutors.map((t) => (
            <TutorCard key={t.id} tutor={t} subjects={catalog.subjects} />
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-ink-2">
            Want to know more before booking? Read the{" "}
            <Link href="/faq" className="link">
              FAQ
            </Link>{" "}
            or our{" "}
            <Link href="/code-of-conduct" className="link">
              code of conduct
            </Link>
            .
          </p>
          <Link href="/book" className="btn btn-primary">
            Book a session <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
