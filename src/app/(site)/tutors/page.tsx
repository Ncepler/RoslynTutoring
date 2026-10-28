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
        lead={`Every session is taught by one of the founders, ${site.school} students who have each earned many 100s on the Regents.`}
      />
      <section className="wrap py-14  md:py-20">
        <div className="grid gap-x-8 sm:grid-cols-2">
          {catalog.tutors.map((t) => (
            <TutorCard key={t.id} tutor={t} subjects={catalog.subjects} />
          ))}
        </div>
        <div className="mt-10">
          <Link href="/book" className="btn btn-primary btn-lg">
            Book a session <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
