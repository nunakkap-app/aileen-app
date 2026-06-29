-- Replace exact-clock one-off schedules with a simpler recurring rule:
-- "ซ้อมทุกวัน X, Y ครั้งละ N ชม. ตั้งแต่วันที่... (ถึงวันที่...)"
-- This is what both parents (self-coaching) and coaches actually want to set, not exact start/end times.

create table practice_schedules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  weekdays smallint[] not null,
  hours_per_session numeric not null,
  start_date date not null default current_date,
  end_date date,
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on practice_schedules to authenticated;

alter table practice_schedules enable row level security;

create policy "coach manages practice schedules for own enrollments" on practice_schedules for all
  using (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ));

create policy "parent manages practice schedules of own children" on practice_schedules for all
  using (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ))
  with check (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ));
