import type { Metadata } from "next";
import { Suspense } from "react";
import { bookingRules, pricing, site } from "@/config/site";
import { BookingFlow, type BookingFlowProps } from "@/components/book/booking-flow";
import { formatPrice } from "@/lib/booking/policy";
import { getCatalog, teachableSubjectIds } from "@/lib/data/catalog";
import { formatLocalDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Book a session",
  description: `Book one-on-one pre-test review on Zoom with a ${site.school} student tutor. ${formatPrice(pricing[30])} for 30 minutes, ${formatPrice(pricing[60])} for an hour.`,
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const catalog = await getCatalog();
  const teachable = teachableSubjectIds(catalog);
  const props: BookingFlowProps = {
    subjects: catalog.subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      hasHonors: s.hasHonors,
      teachable: teachable.has(s.id),
    })),
    tests: catalog.tests.map((t) => ({
      id: t.id,
      subjectId: t.subjectId,
      course: t.course,
      dateLabel: formatLocalDate(t.testDate),
    })),
    prices: { 30: formatPrice(pricing[30]), 60: formatPrice(pricing[60]) },
    grades: [...site.grades],
    maxPreferences: bookingRules.maxPreferences,
    freeCancelHours: bookingRules.freeCancelHours,
    preview: catalog.preview,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24">
      <h1 className="sr-only">Book a session</h1>
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-[22px] bg-bg-subtle" />}>
        <BookingFlow {...props} />
      </Suspense>
    </div>
  );
}
