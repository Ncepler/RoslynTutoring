import type { Metadata } from "next";
import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { LegalPage } from "@/components/site/legal-page";
import { formatPrice } from "@/lib/booking/policy";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms for booking a tutoring session with ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      lead="The rules for booking and paying for a session, written in plain language."
      updated="October 28, 2026"
    >
      <h2>Who we are</h2>
      <p>
        {site.name} is an independent tutoring business run by students in {site.area}. It isn&apos;t a school club and
        isn&apos;t affiliated with or endorsed by the {site.school} School District. By booking a session, the student and
        their parent or guardian agree to these terms.
      </p>

      <h2>Who can book</h2>
      <p>
        Students in grades {site.grades[0]} to {site.grades[site.grades.length - 1]}, with a parent or guardian&apos;s
        permission. The parent or guardian named on the booking agrees to these terms and is responsible for payment.
      </p>

      <h2>How booking works</h2>
      <ul>
        <li>A booking starts as a request. Nothing is charged when you send it.</li>
        <li>Your request goes to all of our tutors. One who teaches the subject and can take one of your chosen times claims it.</li>
        <li>
          Once a tutor claims it, we send a payment link. The time is held for you for up to {bookingRules.holdHours} hours,
          and always ends at least {bookingRules.holdEndsBeforeStartMinutes} minutes before the session. If it isn&apos;t
          paid by then, the time is released.
        </li>
        <li>The session is confirmed once payment goes through.</li>
        <li>If no tutor can take any of your times, or nobody claims it in time, the request is closed and you aren&apos;t charged.</li>
      </ul>

      <h2>Prices and payment</h2>
      <p>
        Sessions cost {formatPrice(pricing[30])} for 30 minutes and {formatPrice(pricing[60])} for an hour, paid in full
        through Stripe before the session. If our prices change, the change never applies to a session that&apos;s
        already confirmed.
      </p>

      <h2>Cancelling and rescheduling</h2>
      <ul>
        <li>
          You can cancel for a full refund up to {bookingRules.freeCancelHours} hours before the session start. To
          reschedule, cancel and book a new time.
        </li>
        <li>Cancellations within {bookingRules.freeCancelHours} hours of the start, and no-shows, are not refunded.</li>
        <li>If we cancel, or your tutor doesn&apos;t show up, you get a full refund or a free new session, your choice.</li>
        <li>If something serious comes up, email us. The founders can make exceptions.</li>
      </ul>
      <p>Refunds go back to the original payment method and usually take 5 to 10 business days to appear.</p>

      <h2>Sessions</h2>
      <ul>
        <li>All sessions are one-on-one on Zoom. We don&apos;t meet in person.</li>
        <li>Please join on time. If you join late, the session still ends at its scheduled time.</li>
        <li>Sessions aren&apos;t recorded by us. Please don&apos;t record without everyone&apos;s permission.</li>
        <li>A parent or guardian is welcome to sit in.</li>
      </ul>

      <h2>What tutoring is, and isn&apos;t</h2>
      <p>
        Our tutors help students understand material and prepare for tests. We can&apos;t promise a particular grade or
        score. We won&apos;t complete graded work, take-home tests, or anything a teacher has said must be done alone.
      </p>

      <h2>Conduct</h2>
      <p>
        Everyone follows our <Link href="/code-of-conduct">code of conduct</Link>. We may cancel a session, or decline
        future bookings, if it&apos;s broken. If we cancel a paid session for that reason, we&apos;ll decide on a refund
        case by case.
      </p>

      <h2>Limits</h2>
      <p>
        We do our best to give helpful, accurate tutoring, but the service is provided as it is. To the extent the law
        allows, our responsibility for any problem is limited to the amount you paid for the session involved.
      </p>

      <h2>Changes and questions</h2>
      <p>
        We may update these terms and will change the date at the top when we do. Questions? Email{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
