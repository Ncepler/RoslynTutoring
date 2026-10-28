# Tutoring

Website and booking system for a student-run tutoring business in Roslyn. Students book one-on-one Zoom review sessions as guests; the four founders run everything from a shared admin dashboard.

The business name is a placeholder. Change it in `src/config/site.ts` (along with the contact email, prices and booking rules) and it updates everywhere.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables set, the site runs in **preview mode**: sample tutors, tests and bookings, a yellow banner at the top, and nothing is saved. The admin dashboard is open at `/admin` in preview mode so you can look around.

```bash
npm run check      # lint + typecheck + unit tests
npm run build      # production build
```

## Stack

Next.js 16 (App Router, Cache Components), TypeScript strict, Tailwind 4, Supabase (Postgres, Auth, RLS), Stripe Checkout, Resend, Google Calendar, Vercel. All free tiers; Stripe charges its normal processing fee per payment.

| Where | What |
|---|---|
| `src/config/site.ts` | Name, school, contact email, prices, booking rules |
| `src/lib/booking/` | Slots, claiming, holds/cancel policy, validation (pure + tested) |
| `src/lib/money.ts`, `src/lib/analytics.ts` | Money split and analytics (pure + tested) |
| `src/lib/data/` | Supabase reads/writes and the booking lifecycle |
| `src/lib/notify.ts` | `notifyAdmins()`: the one place admin alerts go out |
| `src/lib/email/` | Every email the site sends |
| `src/app/(site)/` | Public pages |
| `src/app/admin/` | Dashboard |
| `supabase/migrations/` | Schema and RLS policies |

## Going live

### 1. Supabase

1. Create a free project at supabase.com.
2. In the SQL editor, run each file in `supabase/migrations/` in order.
3. Edit the four placeholder emails in `supabase/seed.sql` to the founders' real emails, then run it.
4. Authentication → Sign In / Providers: turn **off** "Allow new users to sign up".
5. Authentication → Users → Add user, once per founder, with the same email as in the seed. Each login links to its tutor row automatically.
6. Copy the project URL, publishable key and secret key into `.env.local` and Vercel.

To re-check the RLS policies against a local Postgres: `scripts/test-db.sh` (see the comment at the top).

### 2. Vercel

Import the GitHub repo, add the environment variables from `.env.example`, deploy. `vercel.json` schedules `/api/cron/daily` once a day (the free plan allows one run per day) for reminders and cleanup. Set `CRON_SECRET` to any long random string.

### 3. Resend (email)

Create a free account and API key. Resend only emails people other than you once a domain is verified, so this waits on buying the domain. Set `EMAIL_FROM` to an address on that domain.

### 4. Stripe (payments)

Needs an account holder who is 18 or older. Create the account, then:

- Put the secret key in `STRIPE_SECRET_KEY`.
- Developers → Webhooks → add `https://<your-domain>/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

Until Stripe is set up, a local booking page shows a "Mark as paid (dev only)" button so you can test the whole flow.

### 5. Google Calendar (optional)

Create a service account in Google Cloud (free), enable the Calendar API, and put its email and private key in the env vars. Each founder shares their own Google Calendar with that service account email ("Make changes to events") and pastes their calendar ID (usually their Gmail) on **My hours** in the dashboard. Every confirmation email also carries an `.ics` file, so this is optional.

### 6. Each founder

Sign in at `/admin`, set weekly hours and a Zoom link on **My hours**, and check **Subjects** shows what you teach. Your hours decide which times students can pick.

## How booking works

1. Student picks a subject, a length, and up to 3 preferred times (only times when at least one tutor who teaches it is free).
2. They enter their name, grade, email, and a parent's name and email, and a parent consents.
3. Nobody is auto-assigned. All four founders get an email listing the times and who is free for each.
4. Any founder claims it from the dashboard by picking one of the student's times. First claim wins; the others get a "claimed by" email.
5. On claim, the student and parent get the time, the tutor's name and a Stripe link. The slot is held 24 hours (never later than an hour before the session).
6. Once paid: confirmation with Zoom link and calendar file, a Google Calendar event for the tutor, and a reminder on the day.
7. If nobody can take any time, a founder closes it (the student is told). Unclaimed requests expire on their own 90 minutes before the student's last time.

A database constraint makes double-booking a tutor impossible, even if two founders claim at the same moment.
