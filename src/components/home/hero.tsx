import Link from "next/link";
import { pricing, site } from "@/config/site";
import { ArrowRight } from "@/components/icons";
import { formatPrice } from "@/lib/booking/policy";
import type { Catalog } from "@/lib/data/catalog";

function list(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
}

/**
 * One idea, one action. The headline says what this is, one line says why
 * to trust it, and the second link names the people so "who are these
 * people" is answered before the first scroll. Everything else lives below.
 */
export function Hero({ catalog }: { catalog: Catalog }) {
  return (
    <section>
      <div className="wrap pt-16 pb-20 md:pt-28 md:pb-28">
        <h1 className="t-display enter-tf max-w-4xl">
          Test coming up? Review with a {site.school} student who&apos;s been there.
        </h1>
        <p className="t-lead enter mt-6 max-w-xl" style={{ "--i": 1 } as React.CSSProperties}>
          One-on-one on Zoom, from {formatPrice(pricing[30])}. Every tutor is a {site.school} student who has earned many
          100s on the Regents.
        </p>
        <div className="enter mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as React.CSSProperties}>
          <Link href="/book" className="btn btn-primary btn-lg">
            Book a review <ArrowRight size={18} />
          </Link>
          <Link href="/tutors" className="link font-semibold">
            Meet {list(catalog.tutors.map((t) => t.firstName))}
          </Link>
        </div>
      </div>
    </section>
  );
}
