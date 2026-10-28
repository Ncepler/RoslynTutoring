# CLAUDE.md

Website and booking system for a student-run tutoring business at Roslyn. Noah is the only developer. The other founders give feedback and Noah has final say.

Everything below comes from Noah's interview. Items marked **(default)** are my choices where he said "you decide" or left it open. They are listed again under Open decisions. Use them, but flag them in your report.

## The business

- **Name:** not decided. Keep it in one constant (`src/config/site.ts`) so it can be swapped everywhere. Placeholder: `Tutoring`.
- **What it is:** paid, online, one-on-one tutoring by Roslyn students for Roslyn 8th to 10th graders. Independent, not a school club, no school approval needed.
- **Founders and admins (4):** Noah Cepler (11th: Geometry, Algebra 1 and 2), Alex Schlanger (11th: Algebra 1 and 2, Geometry, Chemistry, Spanish), Tyler Shi (Spanish, more TBD), Brody Konigsberg (TBD). Subject lists for Tyler and Brody are incomplete, so make subjects editable data, not hardcoded.
- **Why:** help the community. **Success at 3 months:** many signups and students coming back before each test.
- **Money:** all payments go to one place and are split 4 ways, equally, weekly or monthly.
- **Scope:** Roslyn first. Other schools are possible later, so don't hardcode the school name into logic.
- No legal entity or bank account yet. No launch date.

## Services and pricing

- **Price:** $40 per 30 minutes, $60 per hour.
- **Format:** 1-on-1 on Zoom only. After school only, earliest start 3:30 PM, America/New_York.
- **Subjects at launch:** Algebra 1, Algebra 2, Geometry, Spanish, Chemistry, Living Environment. Regular and honors.
- **Focus:** pre-test review. Students come to us before a test.
- **Possible later:** buy 3 sessions, get 20% off. Not in v1.
- **No cap** on sessions per student as long as each is paid.
- **Cancellation (default):** free cancel or reschedule up to 12 hours before. Later cancels and no-shows are not refunded. Admins can override.
- When no tutor is free for a subject, show "nothing available." No waitlist.
- Review sheets are made by Noah with Claude outside the site and handed to clients. Not a site feature.

## Booking flow

No student accounts. Students book as guests.

1. Student picks a subject.
2. Site shows available times. Student picks one or more preferred times and a length (30 or 60 min).
3. Student enters first name, last name, grade (8 to 10), email.
   **(default)** Also parent/guardian name and email, plus a consent checkbox. Parents are involved and consent is required.
4. The system assigns one tutor who teaches that subject and is free at that time. **(default)** Tie-break: whoever has the fewest sessions this period, to keep the 4-way split fair.
5. The request goes to the admin dashboard. All 4 admins are notified (see Notifications).
6. A tutor accepts or declines.
7. **Payment happens only after a tutor accepts.** **(default)** Stripe Checkout link sent to the student and parent. Hold the slot 24 hours, then expire it. Booking is confirmed when paid.
8. Confirmation email, then a reminder before the session. A Google Calendar event is created for the tutor.
9. On decline, tell the student and release the slot. **(default)** Do not auto-reassign.

Tutor availability: **(default)** each tutor sets a weekly availability from their dashboard. Availability is never shown publicly.

## Admin side

Four separate admin logins, one per founder. No other roles, no tutor application flow. Each dashboard has:

- **Money panel at the top:** total earned, sessions per person, money per person, and what an equal 4-way split would be.
- Schedule view of pending, accepted, and past bookings. Accept or decline.
- All bookings across tutors.
- Manage subjects and which tutor teaches what.
- Manage the **test schedule:** admins enter known upcoming tests (subject, course, date). This is shown prominently on the public homepage with a book-review button per subject.
- Set own weekly availability.
- **Analytics from our own database:** signups, bookings, repeat students, tutor hours. Also request to accepted to paid conversion, bookings by subject, and how many days before a test students book. No third-party trackers, since users are minors.

Not building: ratings, reviews, feedback forms, session history per student, messaging, blog, free resources, referrals, QR codes, tutor applications.

## Public site

Claude writes all copy. Tone: friendly peer, but polished and professional. Don't invent testimonials, stats, or claims. Real claim Noah supplied: the tutors are strong students who have each earned many 100s on Regents.

Pages (my call): Home, Book, Tutors, FAQ, Contact with a "Report a problem" form, Privacy, Terms, Code of conduct.

- **Home:** what it is, upcoming tests with book buttons, subjects, price, how it works in three steps, the tutors, FAQ teaser. The biggest hesitation is "who are these people," so make the tutors visible early.
- **Tutors page:** name, grade, subjects. No photos, no availability.
- **FAQ:** write likely questions yourself (pricing, Zoom, cancellation, parents, who tutors).
- **Contact:** shared group email, which doesn't exist yet. Use a placeholder from config.
- Public to everyone and findable by search: good metadata, sitemap, robots, and local keywords like "Roslyn tutoring."

## Design

Sleek, blue and white, professional, clean Apple-style. Leans startup more than school.

- **No imagery or stock photos.** Carry it with type, spacing, and color.
- Light and dark mode. Default to the device's setting, with a manual toggle that persists.
- A refined font through `next/font`. Not a default-looking one.
- Subtle motion only. Respect `prefers-reduced-motion`.
- Mobile first. Students book from phones and iPads.
- Avoid anything that looks AI-generated. Use the installed design skills (frontend-design, apple-design, animate) when they're available.
- No logo yet. Use a clean text wordmark until one exists.

## Safety and privacy (users are minors)

- Collect the minimum: name, grade, email, plus parent name and email (default).
- Only admins can see student contact info. Enforce with Supabase RLS on every table. The public can only create booking requests through a server route.
- No messaging between tutors and students on the site. Sessions are on Zoom only.
- Parent consent checkbox is required to book.
- Draft plain-language Privacy, Terms, and Code of conduct pages. They are drafts, not lawyer-reviewed. Say so in your report.
- Include a "Report a problem" form that notifies all admins.
- No third-party analytics or ad trackers.

## Stack and conventions

- Next.js (App Router), TypeScript, Supabase (Postgres, Auth, RLS), Vercel, Tailwind. Noah owns the GitHub, Vercel, and Supabase accounts.
- **Required:** TypeScript strict mode, ESLint, and tests for booking, matching, and money-split logic.
- Email through Resend. Payments through Stripe (default). Calendar through the Google Calendar API, with an `.ics` attachment fallback.
- **Budget is $0:** free tiers only. Flag anything that costs money before using it. Only exceptions expected: the domain (company name .com, TBD) and payment processing fees.
- Keep secrets in env vars. Never commit them.
- Put notifications behind one interface, `notifyAdmins()`, so the channel can change.
- All times stored in UTC, shown in America/New_York.

## How to work with Noah

- Use Noah's normal workflow. He is the only person in the repo, so no contributor rules.
- When something is undecided, pick a sensible default, keep going, and list every such choice in your final report. Ask Noah about them at the end, not mid-task.
- Keep reports short and plain.
- Feedback from the other founders reaches you through Noah as edit requests.

## Open decisions

Ask Noah about these at the end of the first build.

1. **Business name,** domain, logo, and the group email address.
2. **Texts to admins:** SMS needs a paid provider, which conflicts with the $0 budget. Default is email via Resend, with SMS added if he picks a provider.
3. **Payment provider and account owner:** Stripe or PayPal. Processors generally require an adult (18+) account holder, so decide whose name the account is under.
4. **Zoom links:** default is each tutor stores a personal Zoom link in their profile and it goes in the confirmation and calendar event.
5. **Parent fields** at booking (default above).
6. **Weekend availability** and whether any hours before 3:30 PM are ever allowed.
7. **Cancellation policy** (default above) and the **3-session discount** (deferred).
8. **Tyler's and Brody's subjects.**
9. **Launch date.** No business entity exists yet. Worth sorting out before taking real payments.
