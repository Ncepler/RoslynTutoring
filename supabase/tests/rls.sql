\set ON_ERROR_STOP 0
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'Noah@Example.com'), ('00000000-0000-0000-0000-00000000000b', 'stranger@example.com');
select 'linked' as check, first_name, user_id is not null as linked from tutors order by sort_order;

-- service role creates a student + booking (what the server route does)
insert into students (id, first_name, last_name, grade, email, parent_name, parent_email)
  values ('10000000-0000-0000-0000-000000000001','Sam','Lee',9,'sam@example.com','Pat Lee','pat@example.com');
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, start_at, end_at, tutor_id, price_cents, consent_at)
select 'tok1', '10000000-0000-0000-0000-000000000001', s.id, 60, array['2026-11-02 20:30Z'::timestamptz], '2026-11-02 20:30Z', '2026-11-02 21:30Z', t.id, 6000, now()
from subjects s, tutors t where s.slug='geometry' and t.first_name='Noah';

\echo '--- overlap must fail (exclusion constraint)'
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, start_at, end_at, tutor_id, price_cents, consent_at)
select 'tok2', '10000000-0000-0000-0000-000000000001', s.id, 30, array['2026-11-02 21:00Z'::timestamptz], '2026-11-02 21:00Z', '2026-11-02 21:30Z', t.id, 4000, now()
from subjects s, tutors t where s.slug='geometry' and t.first_name='Noah';
\echo '--- back-to-back must succeed'
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, start_at, end_at, tutor_id, price_cents, consent_at, status)
select 'tok3', '10000000-0000-0000-0000-000000000001', s.id, 30, array['2026-11-02 21:30Z'::timestamptz], '2026-11-02 21:30Z', '2026-11-02 22:00Z', t.id, 4000, now(), 'pending'
from subjects s, tutors t where s.slug='geometry' and t.first_name='Noah';
\echo '--- overlap with a declined booking must succeed'
update bookings set status='declined' where public_token='tok3';
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, start_at, end_at, tutor_id, price_cents, consent_at)
select 'tok4', '10000000-0000-0000-0000-000000000001', s.id, 30, array['2026-11-02 21:30Z'::timestamptz], '2026-11-02 21:30Z', '2026-11-02 22:00Z', t.id, 4000, now()
from subjects s, tutors t where s.slug='geometry' and t.first_name='Noah';

\echo '=== ANON'
set role anon;
select 'anon tutors' as check, count(*) from tutors;
select 'anon subjects' as check, count(*) from subjects;
select 'anon tutor_private (expect 0)' as check, count(*) from tutor_private;
select 'anon students (expect 0)' as check, count(*) from students;
select 'anon bookings (expect 0)' as check, count(*) from bookings;
select 'anon availability (expect 0)' as check, count(*) from availability;
\echo '--- anon insert booking must fail'
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, start_at, end_at, tutor_id, price_cents, consent_at)
select 'tok9', '10000000-0000-0000-0000-000000000001', s.id, 30, array[now()], now(), now()+interval '30 min', t.id, 0, now() from subjects s, tutors t limit 1;
\echo '--- anon insert student must fail'
insert into students (first_name, last_name, grade, email, parent_name, parent_email) values ('x','y',9,'x@y.z','p','p@y.z');
\echo '--- uppercase student email must fail (service role)'
reset role;
insert into students (first_name, last_name, grade, email, parent_name, parent_email) values ('x','y',9,'X@y.z','p','p@y.z');
set role anon;
\echo '--- anon insert test must fail'
insert into tests (subject_id, course, test_date) select id, 'x', current_date from subjects limit 1;
reset role;

\echo '=== STRANGER (authenticated, not a founder)'
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select 'stranger students (expect 0)' as check, count(*) from students;
select 'stranger bookings (expect 0)' as check, count(*) from bookings;
select 'stranger tutor_private (expect 0)' as check, count(*) from tutor_private;
\echo '--- stranger update booking affects 0 rows'
update bookings set status='cancelled';
reset role;

\echo '=== NOAH (admin)'
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select 'noah is_admin' as check, is_admin();
select 'noah students' as check, count(*) from students;
select 'noah bookings' as check, count(*) from bookings;
select 'noah tutor_private' as check, count(*) from tutor_private;
insert into availability (tutor_id, weekday, start_minute, end_minute) select id, 1, 930, 1140 from tutors where first_name='Noah';
select 'noah own availability inserted' as check, count(*) from availability;
\echo '--- noah inserting availability for Alex must fail'
insert into availability (tutor_id, weekday, start_minute, end_minute) select id, 1, 930, 1140 from tutors where first_name='Alex';
\echo '--- noah editing Alex zoom link affects 0 rows'
update tutor_private set zoom_link='x' where tutor_id=(select id from tutors where first_name='Alex');
update tutor_private set zoom_link='https://zoom.us/j/1' where tutor_id=current_tutor_id();
select 'noah zoom set' as check, count(*) from tutor_private where zoom_link is not null;
insert into tests (subject_id, course, test_date) select id, 'Geometry Regents', '2027-06-18' from subjects where slug='geometry';
select 'noah test added' as check, count(*) from tests;
update bookings set status='awaiting_payment' where public_token='tok1';
select 'noah updated booking' as check, status from bookings where public_token='tok1';
reset role;

\echo '=== CLAIM MODEL (service role)'
\echo '--- open request with no tutor or time must succeed'
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, claim_deadline, price_cents, consent_at)
select 'open1', '10000000-0000-0000-0000-000000000001', s.id, 60, array['2026-11-05T21:00Z'::timestamptz, '2026-11-06T21:00Z'::timestamptz], '2026-11-06T19:30Z', 6000, now()
from subjects s where s.slug = 'geometry';
select 'open request saved' as check, count(*) from bookings where public_token = 'open1' and tutor_id is null and start_at is null;
\echo '--- marking it awaiting_payment without a tutor must fail'
update bookings set status = 'awaiting_payment' where public_token = 'open1';
\echo '--- claiming it (tutor + time + awaiting_payment) must succeed'
update bookings set tutor_id = (select id from tutors where first_name = 'Alex'),
  start_at = '2026-11-05T21:00Z', end_at = '2026-11-05T22:00Z', status = 'awaiting_payment'
where public_token = 'open1' and tutor_id is null;
select 'claimed' as check, status from bookings where public_token = 'open1';
\echo '--- Noah claiming a time that overlaps his own session must fail'
insert into bookings (public_token, student_id, subject_id, duration_minutes, requested_starts, price_cents, consent_at, tutor_id, start_at, end_at, status)
select 'open2', '10000000-0000-0000-0000-000000000001', s.id, 30, array['2026-11-02T21:00Z'::timestamptz], 4000, now(), t.id, '2026-11-02T21:00Z', '2026-11-02T21:30Z', 'awaiting_payment'
from subjects s, tutors t where s.slug = 'geometry' and t.first_name = 'Noah';
