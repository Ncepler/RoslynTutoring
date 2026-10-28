import type { Metadata } from "next";
import { site } from "@/config/site";
import { PageIntro } from "@/components/site/page-intro";
import { ReportForm } from "@/components/site/report-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.name}, or report a problem with a booking, payment or session.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageIntro
        title="Contact us"
        lead={
          <>
            Questions about booking, payments or a session go to all four founders at{" "}
            <a href={`mailto:${site.contactEmail}`} className="link font-semibold">
              {site.contactEmail}
            </a>
            .
          </>
        }
      />
      <section className="wrap grid gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="report" className="t-h3 text-2xl">
            Report a problem
          </h2>
          <p className="mt-3 text-ink-2">
            Something wrong with a booking, payment, session or this site? Every report goes to all four founders, and
            your name and email are optional.
          </p>
          <p className="mt-6 text-sm text-muted">
            If anyone makes you feel unsafe, stop the session and tell a parent or another trusted adult. If someone is in
            danger, call 911.
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <ReportForm />
        </div>
      </section>
    </>
  );
}
