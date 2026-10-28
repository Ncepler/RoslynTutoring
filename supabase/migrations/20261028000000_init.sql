-- Tutoring: initial schema.
-- All times are stored in UTC (timestamptz). Weekly availability is stored as
-- minutes after local midnight in America/New_York, which is how tutors think about it.
--
-- Security model:
--   * RLS is enabled on every table.
--   * The public (anon) can read only non-sensitive catalog data: active tutors'
--     names and grades, subjects, who teaches what, and the test schedule.
--   * Student contact info, bookings, availability and reports are admin-only.
--   * The public creates booking requests and problem reports only through
--     server routes that use the service role key after validating input.

create extension if not exists btree_gist with schema extensions;

create type public.booking_status as enum (
  'pending',           -- requested, waiting for the tutor to accept or decline
  'awaiting_payment',  -- accepted, slot held until hold_expires_at
  'confirmed',         -- paid
  'declined',          -- tutor declined; slot released
  'expired',           -- no response in time, or the payment hold ran out
  'cancelled'          -- cancelled by the student or an admin
);

create type public.course_level as enum ('regular', 'honors');

-- ---------------------------------------------------------------------------
-- Tutors (the four founders). Public columns only.
-- ---------------------------------------------------------------------------
create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  grade smallint check (grade between 6 and 12),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Private tutor details. Never readable by the public.
create table public.tutor_private (
  tutor_id uuid primary key references public.tutors (id) on delete cascade,
  email text not null unique,
  zoom_link text,
  calendar_id text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subjects and who teaches them. Editable data, not hardcoded.
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  has_honors boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tutor_subjects (
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  primary key (tutor_id, subject_id)
);

-- ---------------------------------------------------------------------------
-- Weekly availability, set by each tutor. Never shown publicly.
-- ---------------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1440),
  end_minute smallint not null check (end_minute between 0 and 1440),
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index availability_tutor_idx on public.availability (tutor_id);

-- ---------------------------------------------------------------------------
-- Test schedule, entered by admins, shown on the homepage.
-- ---------------------------------------------------------------------------
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  course text not null check (char_length(course) between 1 and 120),
  level public.course_level, -- null means both regular and honors
  test_date date not null,
  created_by uuid references public.tutors (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tests_date_idx on public.tests (test_date);

-- ---------------------------------------------------------------------------
-- Students (guests, no accounts). Minimum data only.
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  grade smallint not null check (grade between 1 and 12),
  -- Stored lowercase so a returning student is recognized by email.
  email text not null unique check (char_length(email) <= 254 and email = lower(email)),
  parent_name text not null check (char_length(parent_name) between 1 and 160),
  parent_email text not null check (char_length(parent_email) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bookings.
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  student_id uuid not null references public.students (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  level public.course_level not null default 'regular',
  test_id uuid references public.tests (id) on delete set null,
  duration_minutes smallint not null check (duration_minutes in (30, 60)),
  requested_starts timestamptz[] not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  tutor_id uuid not null references public.tutors (id) on delete restrict,
  status public.booking_status not null default 'pending',
  price_cents integer not null check (price_cents >= 0),

  hold_expires_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_checkout_url text,
  stripe_payment_intent_id text,
  amount_paid_cents integer not null default 0,
  fee_cents integer not null default 0,
  refunded_cents integer not null default 0,

  accepted_at timestamptz,
  declined_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  responded_by uuid references public.tutors (id) on delete set null,
  cancelled_by text check (cancelled_by in ('student', 'admin', 'system')),
  cancel_reason text,

  google_event_id text,
  reminder_sent_at timestamptz,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_at > start_at),
  -- A tutor can never be double-booked by an active booking. This is the
  -- backstop for two students grabbing the same slot at the same moment.
  constraint bookings_no_overlap exclude using gist (
    tutor_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'awaiting_payment', 'confirmed'))
);
create index bookings_status_idx on public.bookings (status);
create index bookings_start_idx on public.bookings (start_at);
create index bookings_student_idx on public.bookings (student_id);
create index bookings_tutor_idx on public.bookings (tutor_id);

-- ---------------------------------------------------------------------------
-- "Report a problem" submissions.
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  name text check (char_length(name) <= 160),
  email text check (char_length(email) <= 254),
  topic text not null default 'other',
  message text not null check (char_length(message) between 1 and 4000),
  page text check (char_length(page) <= 300),
  resolved_at timestamptz,
  resolved_by uuid references public.tutors (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();
create trigger tutor_private_touch before update on public.tutor_private
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Admin helpers. Every founder is an admin; there are no other roles.
-- ---------------------------------------------------------------------------
create or replace function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id from public.tutors t
  where t.user_id = (select auth.uid()) and t.active
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tutors t
    where t.user_id = (select auth.uid()) and t.active
  );
$$;

revoke execute on function public.current_tutor_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.current_tutor_id() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Link a new auth user to their tutor row by email, so admin accounts can be
-- created from the Supabase dashboard without editing ids by hand.
create or replace function public.link_tutor_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tutors t
     set user_id = new.id
    from public.tutor_private p
   where p.tutor_id = t.id
     and lower(p.email) = lower(new.email)
     and t.user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_tutor_account();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.tutors enable row level security;
alter table public.tutor_private enable row level security;
alter table public.subjects enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.availability enable row level security;
alter table public.tests enable row level security;
alter table public.students enable row level security;
alter table public.bookings enable row level security;
alter table public.reports enable row level security;

-- tutors: public can see active tutors' names and grades.
create policy "active tutors are public" on public.tutors
  for select to anon
  using (active);
create policy "signed-in users see active tutors, admins see all" on public.tutors
  for select to authenticated
  using (active or (select public.is_admin()));
create policy "admins manage tutors" on public.tutors
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- tutor_private: admins read; each admin edits only their own row.
create policy "admins read tutor_private" on public.tutor_private
  for select to authenticated
  using ((select public.is_admin()));
create policy "tutors edit own private row" on public.tutor_private
  for update to authenticated
  using (tutor_id = (select public.current_tutor_id()))
  with check (tutor_id = (select public.current_tutor_id()));
create policy "tutors insert own private row" on public.tutor_private
  for insert to authenticated
  with check (tutor_id = (select public.current_tutor_id()));

-- subjects
create policy "active subjects are public" on public.subjects
  for select to anon
  using (active);
create policy "signed-in users see active subjects, admins see all" on public.subjects
  for select to authenticated
  using (active or (select public.is_admin()));
create policy "admins manage subjects" on public.subjects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- tutor_subjects
create policy "tutor_subjects are public" on public.tutor_subjects
  for select to anon, authenticated
  using (true);
create policy "admins manage tutor_subjects" on public.tutor_subjects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- availability: admins read all; each tutor writes only their own.
create policy "admins read availability" on public.availability
  for select to authenticated
  using ((select public.is_admin()));
create policy "tutors insert own availability" on public.availability
  for insert to authenticated
  with check (tutor_id = (select public.current_tutor_id()));
create policy "tutors update own availability" on public.availability
  for update to authenticated
  using (tutor_id = (select public.current_tutor_id()))
  with check (tutor_id = (select public.current_tutor_id()));
create policy "tutors delete own availability" on public.availability
  for delete to authenticated
  using (tutor_id = (select public.current_tutor_id()));

-- tests
create policy "tests are public" on public.tests
  for select to anon, authenticated
  using (true);
create policy "admins manage tests" on public.tests
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- students: admins only. No public policies at all.
create policy "admins read students" on public.students
  for select to authenticated
  using ((select public.is_admin()));
create policy "admins update students" on public.students
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- bookings: admins only. No public policies at all.
create policy "admins read bookings" on public.bookings
  for select to authenticated
  using ((select public.is_admin()));
create policy "admins update bookings" on public.bookings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- reports: admins only.
create policy "admins read reports" on public.reports
  for select to authenticated
  using ((select public.is_admin()));
create policy "admins update reports" on public.reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
