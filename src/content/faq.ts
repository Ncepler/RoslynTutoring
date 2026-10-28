import { bookingRules, pricing, site } from "@/config/site";
import { formatPrice } from "@/lib/booking/policy";

export type Faq = { q: string; a: string };

/** Written for students and parents. No promises we can't keep. */
export const FAQ: Faq[] = [
  {
    q: "Who are the tutors?",
    a: `${site.school} students who have each earned many 100s on Regents exams. Every tutor is also one of the four founders, so the people you book are the people running this. You can see who teaches what on the tutors page.`,
  },
  {
    q: "How much does it cost?",
    a: `${formatPrice(pricing[30])} for 30 minutes or ${formatPrice(pricing[60])} for an hour. You only pay after a tutor accepts your request. There are no packages, sign-up fees or subscriptions.`,
  },
  {
    q: "How do sessions work?",
    a: "Every session is one-on-one on Zoom. Your confirmation email has the Zoom link and a calendar file. Bring your notes, a recent quiz or test, and the topics you're unsure about, and your tutor will focus on what's on the test.",
  },
  {
    q: "When can I book?",
    a: `After school, ${bookingRules.allowWeekends ? "any day of the week" : "Monday to Friday"}, starting at 3:30 PM. You can book up to ${bookingRules.daysAhead} days ahead and need to give at least ${bookingRules.minLeadHours} hours' notice. The booking page only shows times when a tutor for your subject is actually free.`,
  },
  {
    q: "What subjects do you cover?",
    a: "Algebra 1, Geometry, Algebra 2, Chemistry, Living Environment and Spanish, at both regular and honors levels. If a subject shows no open times, no tutor is free for it right now. Check back, since tutors update their hours.",
  },
  {
    q: "What if I need to cancel?",
    a: `You can cancel or reschedule for free up to ${bookingRules.freeCancelHours} hours before your session from the link in your confirmation email. Cancellations after that, and no-shows, aren't refunded. If something serious comes up, email us and we'll look at it.`,
  },
  {
    q: "Do parents need to be involved?",
    a: "Yes. Every booking includes a parent or guardian's name and email, and a parent or guardian has to agree before you can book. Parents get a copy of every email about the session, including the payment link.",
  },
  {
    q: "How do you keep students safe?",
    a: `Sessions only happen on Zoom, and there's no messaging between tutors and students on this site. We collect only what we need to run a session, and only the four founders can see it. You can read our code of conduct, and report a problem any time from the contact page.`,
  },
  {
    q: "Is this a school program?",
    a: `No. ${site.name} is an independent business run by students. It isn't a school club and isn't affiliated with the ${site.school} School District.`,
  },
  {
    q: "What if I book and no tutor accepts?",
    a: "You'll get an email saying the time didn't work out and you won't be charged. The time is released and you can pick another one.",
  },
];
