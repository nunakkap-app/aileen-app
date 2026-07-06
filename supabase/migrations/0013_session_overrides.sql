-- One-off overrides per session: reschedule to another date, or change time/hours for that day only.

create table session_overrides (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  original_date date not null,   -- the scheduled date being overridden
  new_date date,                 -- if moved to another day; null = same day (time change only)
  override_start_time time,      -- lesson: new start time for this occurrence
  override_end_time time,        -- lesson: new end time for this occurrence
  override_hours numeric(4,1),   -- practice: new hours for this occurrence
  created_at timestamptz not null default now(),
  unique (enrollment_id, original_date)
);

grant select, insert, update, delete on session_overrides to authenticated;
alter table session_overrides enable row level security;

create policy "manage own session overrides" on session_overrides for all
  using (
    exists (select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id))
    or exists (select 1 from enrollments e join subjects s on s.id = e.subject_id where e.id = enrollment_id and s.coach_id = auth.uid())
  )
  with check (
    exists (select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id))
    or exists (select 1 from enrollments e join subjects s on s.id = e.subject_id where e.id = enrollment_id and s.coach_id = auth.uid())
  );
