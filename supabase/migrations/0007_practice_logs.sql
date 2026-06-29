-- Per-day exceptions to a recurring practice plan (skip a specific date without
-- deleting the whole weekly rule), plus per-day session logs: timer
-- (start/pause/resume/stop) and a media attachment (photo/clip) for the coach
-- to review or just to keep as history.

create table practice_exceptions (
  id uuid primary key default gen_random_uuid(),
  practice_schedule_id uuid not null references practice_schedules (id) on delete cascade,
  exception_date date not null,
  unique (practice_schedule_id, exception_date)
);

create table practice_logs (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  log_date date not null,
  status text not null default 'not_started' check (status in ('not_started', 'running', 'paused', 'done')),
  elapsed_seconds integer not null default 0,
  running_since timestamptz,
  note text,
  media_url text,
  created_at timestamptz not null default now(),
  unique (enrollment_id, log_date)
);

grant select, insert, update, delete on practice_exceptions, practice_logs to authenticated;

alter table practice_exceptions enable row level security;
alter table practice_logs enable row level security;

create policy "coach manages exceptions for own schedules" on practice_exceptions for all
  using (exists (
    select 1 from practice_schedules ps
    join enrollments e on e.id = ps.enrollment_id
    join subjects s on s.id = e.subject_id
    where ps.id = practice_schedule_id and s.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from practice_schedules ps
    join enrollments e on e.id = ps.enrollment_id
    join subjects s on s.id = e.subject_id
    where ps.id = practice_schedule_id and s.coach_id = auth.uid()
  ));

create policy "parent manages exceptions for own children" on practice_exceptions for all
  using (exists (
    select 1 from practice_schedules ps
    join enrollments e on e.id = ps.enrollment_id
    where ps.id = practice_schedule_id and is_own_child(e.child_id)
  ))
  with check (exists (
    select 1 from practice_schedules ps
    join enrollments e on e.id = ps.enrollment_id
    where ps.id = practice_schedule_id and is_own_child(e.child_id)
  ));

create policy "coach manages logs for own enrollments" on practice_logs for all
  using (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ));

create policy "parent manages logs of own children" on practice_logs for all
  using (exists (select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)))
  with check (exists (select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)));

insert into storage.buckets (id, name, public)
values ('practice-media', 'practice-media', true)
on conflict (id) do nothing;

create policy "authenticated upload practice media" on storage.objects for insert
  with check (bucket_id = 'practice-media' and auth.uid() is not null);

create policy "authenticated read practice media" on storage.objects for select
  using (bucket_id = 'practice-media');
