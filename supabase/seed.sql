-- Starting data: the four founders, the launch subjects, and who teaches what.
-- Replace the placeholder emails with each founder's real email BEFORE creating
-- their login in Supabase Auth. A new auth user is linked to their tutor row by
-- matching email (see link_tutor_account in the migration).

insert into public.subjects (slug, name, has_honors, sort_order) values
  ('algebra-1', 'Algebra 1', true, 10),
  ('geometry', 'Geometry', true, 20),
  ('algebra-2', 'Algebra 2', true, 30),
  ('chemistry', 'Chemistry', true, 40),
  ('living-environment', 'Living Environment', true, 50),
  ('spanish', 'Spanish', true, 60)
on conflict (slug) do nothing;

with new_tutors as (
  insert into public.tutors (first_name, last_name, grade, sort_order) values
    ('Noah', 'Cepler', 11, 10),
    ('Alex', 'Schlanger', 11, 20),
    ('Tyler', 'Shi', null, 30),     -- grade not given yet
    ('Brody', 'Konigsberg', null, 40) -- grade not given yet
  returning id, first_name
)
insert into public.tutor_private (tutor_id, email)
select id,
  case first_name
    when 'Noah' then 'noah@example.com'
    when 'Alex' then 'alex@example.com'
    when 'Tyler' then 'tyler@example.com'
    when 'Brody' then 'brody@example.com'
  end
from new_tutors;

insert into public.tutor_subjects (tutor_id, subject_id)
select t.id, s.id
from public.tutors t
join public.subjects s on s.slug = any (
  case t.first_name
    when 'Noah' then array['geometry', 'algebra-1', 'algebra-2']
    when 'Alex' then array['algebra-1', 'algebra-2', 'geometry', 'chemistry', 'spanish']
    when 'Tyler' then array['spanish']
    else array[]::text[] -- Brody: subjects TBD
  end
)
on conflict do nothing;

-- If the founders' auth users already exist, link them now.
update public.tutors t
   set user_id = u.id
  from public.tutor_private p, auth.users u
 where p.tutor_id = t.id
   and lower(p.email) = lower(u.email)
   and t.user_id is null;
