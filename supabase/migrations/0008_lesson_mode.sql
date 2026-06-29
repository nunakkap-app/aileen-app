-- Two modes per activity:
-- "เรียน" (lesson): instructor (parent or coach) is fixed at program setup, used to
--   evaluate that specific instructor later, with an exact locked weekday + clock time.
-- "ซ้อม" (practice): either parent or coach can run it, flexible weekdays + hours only
--   (already built as practice_schedules).

create type enrollment_mode as enum ('lesson', 'practice');

alter table enrollments add column mode enrollment_mode not null default 'practice';
alter table invitations add column mode enrollment_mode not null default 'practice';
alter table requests add column mode enrollment_mode not null default 'practice';

create table lesson_schedules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  start_date date not null default current_date,
  end_date date,
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on lesson_schedules to authenticated;

alter table lesson_schedules enable row level security;

create policy "coach manages lesson schedules for own enrollments" on lesson_schedules for all
  using (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ));

create policy "parent manages lesson schedules of own children" on lesson_schedules for all
  using (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ))
  with check (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ));
