import type { Metadata } from "next";
import { site } from "@/config/site";
import { Flag, Shield } from "@/components/icons";
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
      <PageIntro title="Contact us" lead="Questions about booking, payments or a session go to all four founders.">
        <a href={`mailto:${site.contactEmail}`} className="btn btn-primary btn-lg enter mt-8" style={{ "--i": 2 } as React.CSSProperties}>
          {site.contactEmail}
        </a>
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="report" className="t-h3 flex items-center gap-2.5 text-2xl">
            <Flag size={22} className="text-accent-text" />
            Report a problem
          </h2>
          <p className="mt-3 text-ink-2">
            Something wrong with a booking, a payment, a session or this site? Tell us here. Every report goes to all four
            founders. You can leave your name and email out if you prefer.
          </p>
          <div className="mt-8 flex gap-3 rounded-[18px] border border-line bg-bg-subtle p-5">
            <Shield size={22} className="mt-0.5 shrink-0 text-accent-text" />
            <p className="text-sm leading-relaxed text-ink-2">
              If anyone ever makes you feel unsafe, stop the session and tell a parent or another trusted adult. If someone
              is in danger, call 911.
            </p>
          </div>
        </div>
        <ReportForm />
      </section>
    </>
  );
}
