create table lesson_exceptions (
  id uuid primary key default gen_random_uuid(),
  lesson_schedule_id uuid references lesson_schedules(id) on delete cascade not null,
  exception_date date not null,
  created_at timestamptz default now(),
  unique (lesson_schedule_id, exception_date)
);

alter table lesson_exceptions enable row level security;

create policy "Parents can manage lesson exceptions for their children"
  on lesson_exceptions
  using (
    exists (
      select 1 from lesson_schedules ls
      join enrollments e on e.id = ls.enrollment_id
      join children c on c.id = e.child_id
      where ls.id = lesson_exceptions.lesson_schedule_id
        and c.parent_id = auth.uid()
    )
  );
