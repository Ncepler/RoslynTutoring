-- Requests are no longer auto-assigned to a tutor. A new request goes to all
-- four founders, and one of them claims it by picking one of the student's
-- preferred times. Until then the request has no tutor and no fixed time.

alter table public.bookings alter column tutor_id drop not null;
alter table public.bookings alter column start_at drop not null;
alter table public.bookings alter column end_at drop not null;

-- An unclaimed request expires at this moment (too close to the last
-- preferred time to claim and still pay).
alter table public.bookings add column claim_deadline timestamptz;

-- Anything accepted or paid must have a tutor and a time.
alter table public.bookings add constraint bookings_claimed_has_tutor_and_time check (
  status in ('pending', 'declined', 'expired', 'cancelled')
  or (tutor_id is not null and start_at is not null and end_at is not null)
);

create index bookings_claim_deadline_idx on public.bookings (claim_deadline) where status = 'pending';

-- Requests created under the old flow keep their assigned time as the deadline anchor.
update public.bookings
   set claim_deadline = start_at - interval '90 minutes'
 where status = 'pending' and claim_deadline is null and start_at is not null;
