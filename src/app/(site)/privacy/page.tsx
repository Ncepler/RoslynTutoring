import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name} collects, why, and who can see it.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      lead="Most of the people we work with are minors, so we collect as little as we can and keep it to ourselves."
      updated="October 28, 2026"
    >
      <h2>The short version</h2>
      <ul>
        <li>We only collect what we need to schedule and run a session.</li>
        <li>Only the four founders can see student and parent contact details.</li>
        <li>We don&apos;t use ads, tracking cookies, or third-party analytics.</li>
        <li>We never sell or share your information for marketing.</li>
        <li>You can ask us to delete your information at any time.</li>
      </ul>

      <h2>Who we are</h2>
      <p>
        {site.name} is an independent tutoring business run by students in {site.area}. It isn&apos;t part of, or
        affiliated with, the {site.school} School District. You can reach us at{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>What we collect</h2>
      <h3>When you book</h3>
      <ul>
        <li>The student&apos;s first and last name, grade, and email address.</li>
        <li>A parent or guardian&apos;s name and email address, and their agreement to the booking.</li>
        <li>The session details: subject, level, length, the times you picked, and the test you&apos;re preparing for if you chose one.</li>
      </ul>
      <h3>When you pay</h3>
      <p>
        Payments are handled by Stripe on its own secure page. We never see or store card numbers. Stripe tells us
        whether a payment went through, the amount, and its fee.
      </p>
      <h3>When you report a problem</h3>
      <p>Whatever you write in the form. Your name and email are optional there.</p>
      <h3>What we don&apos;t collect</h3>
      <p>
        No accounts or passwords for students, no location, no photos, and no browsing history. The only thing this site
        stores in your browser is your light or dark mode choice. Founders have a login cookie for the admin dashboard.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To match a request with a tutor, confirm it, and send the payment link.</li>
        <li>To send confirmations, Zoom details, reminders, and cancellation notices. Parents are copied on these.</li>
        <li>To keep track of payments and split them among the founders.</li>
        <li>To count things like how many sessions we run per subject, using only our own records.</li>
        <li>To respond to problem reports.</li>
      </ul>

      <h2>Who can see it</h2>
      <p>
        Only the four founders, each through their own login. Database rules enforce this: the public website can create
        a booking request but can&apos;t read anyone&apos;s information. There is no messaging between tutors and students
        on this site.
      </p>
      <p>We use a few services to run the site. Each one only gets what it needs:</p>
      <ul>
        <li>Supabase stores our database.</li>
        <li>Vercel hosts the website.</li>
        <li>Stripe processes payments.</li>
        <li>Resend sends our emails.</li>
        <li>Google Calendar holds the tutor&apos;s copy of the session, with the student&apos;s first name and last initial.</li>
        <li>Zoom hosts the sessions themselves.</li>
      </ul>

      <h2>Students under 13</h2>
      <p>
        We tutor grades 8 to 10, and the service is meant for students who are 13 or older with a parent or
        guardian&apos;s permission. A parent or guardian has to agree to every booking. If a student is under 13, a
        parent or guardian should make the booking. If you think we have information about a child under 13 without a
        parent&apos;s consent, email us and we&apos;ll delete it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep booking records while we&apos;re running the business so we can handle questions, refunds, and our own
        bookkeeping. Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll delete your
        information, except for basic payment records we need to keep.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct, or delete the information we have about you or your child. Parents can ask on behalf
        of their child. We&apos;ll answer within a week.
      </p>

      <h2>Changes</h2>
      <p>
        If we change how we handle information, we&apos;ll update this page and the date at the top. Questions? Use the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
