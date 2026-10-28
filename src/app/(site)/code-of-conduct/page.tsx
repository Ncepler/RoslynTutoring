import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Code of conduct",
  description: `How tutors, students and parents at ${site.name} treat each other, and how to report a problem.`,
  alternates: { canonical: "/code-of-conduct" },
};

export default function ConductPage() {
  return (
    <LegalPage
      title="Code of conduct"
      lead="Simple rules that keep sessions safe, respectful and useful for everyone."
      updated="October 28, 2026"
    >
      <h2>Everyone</h2>
      <ul>
        <li>Be respectful. No harassment, bullying, or discriminatory language.</li>
        <li>Keep it about schoolwork.</li>
        <li>Keep each other&apos;s personal information private.</li>
        <li>If something feels wrong, stop and tell a parent or another trusted adult, and report it to us.</li>
      </ul>

      <h2>Tutors</h2>
      <ul>
        <li>Meet students only on Zoom, only for sessions booked through this site.</li>
        <li>
          Contact a student only by email, and only about their session. Copy the parent or guardian on every message. No
          texting, social media, or direct messages.
        </li>
        <li>Never meet a student in person through {site.name}.</li>
        <li>Show up on time and prepared. If you can&apos;t make it, tell the student and the other founders right away.</li>
        <li>Never record a session.</li>
        <li>Help students learn. Don&apos;t do graded work for them.</li>
        <li>Keep student information inside the dashboard. Don&apos;t share it or use it for anything else.</li>
        <li>Report any concern about a student&apos;s safety to the other founders and to the student&apos;s parent.</li>
      </ul>

      <h2>Students</h2>
      <ul>
        <li>Join on time, from a quiet place, with your notes and materials ready.</li>
        <li>Be honest about what you need help with.</li>
        <li>
          Follow your teachers&apos; rules. We can help you study, but we won&apos;t help with anything that&apos;s meant to be
          done on your own.
        </li>
        <li>Don&apos;t record the session or share the Zoom link.</li>
      </ul>

      <h2>Parents and guardians</h2>
      <ul>
        <li>You&apos;re welcome to sit in on any session or check in at the end.</li>
        <li>You&apos;re copied on every email about your child&apos;s sessions.</li>
        <li>Please tell us right away if anything concerns you.</li>
      </ul>

      <h2>Reporting a problem</h2>
      <p>
        Use the <Link href="/contact#report">report form</Link> or email{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. Reports go to all four founders, and you can stay
        anonymous. If someone is in immediate danger, call 911.
      </p>

      <h2>If the code is broken</h2>
      <p>
        Depending on what happened, we may end a session early, cancel future bookings, or stop working with someone. A
        tutor who breaks these rules stops tutoring.
      </p>
    </LegalPage>
  );
}
