-- Aileen: schema for parent/coach student-tracking app
-- Roles -----------------------------------------------------------------

create type app_role as enum ('parent', 'coach', 'admin');
create type category as enum ('sport', 'music', 'academic');
create type enrollment_status as enum ('active', 'paused');
create type attendance_status as enum ('present', 'absent', 'late');
create type submission_status as enum ('pending', 'submitted', 'graded');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);

create table children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles (id) on delete cascade,
  full_name text not null,
  birthdate date,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  category category not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children (id) on delete cascade,
  subject_id uuid not null references subjects (id) on delete cascade,
  status enrollment_status not null default 'active',
  started_at date not null default current_date,
  unique (child_id, subject_id)
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  status attendance_status not null,
  note text,
  marked_at timestamptz not null default now(),
  unique (schedule_id, child_id)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  content text,
  file_url text,
  status submission_status not null default 'pending',
  submitted_at timestamptz,
  unique (assignment_id, child_id)
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions (id) on delete cascade,
  schedule_id uuid references schedules (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  score numeric,
  max_score numeric,
  comment text,
  criteria jsonb,
  created_at timestamptz not null default now(),
  check (submission_id is not null or schedule_id is not null)
);

create table benchmarks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects (id) on delete cascade,
  level_name text not null,
  min_age int,
  max_age int,
  criteria jsonb not null,
  created_at timestamptz not null default now()
);

-- Helper functions --------------------------------------------------------

create or replace function has_role(check_role app_role)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = check_role
  );
$$;

create or replace function is_own_child(target_child_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from children
    where id = target_child_id and parent_id = auth.uid()
  );
$$;

create or replace function coaches_child(target_child_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from enrollments e
    join subjects s on s.id = e.subject_id
    where e.child_id = target_child_id and s.coach_id = auth.uid()
  );
$$;

-- RLS ---------------------------------------------------------------------

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table children enable row level security;
alter table subjects enable row level security;
alter table enrollments enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table evaluations enable row level security;
alter table benchmarks enable row level security;

create policy "read own profile" on profiles for select using (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "insert own profile" on profiles for insert with check (id = auth.uid());

create policy "read own roles" on user_roles for select using (user_id = auth.uid());
create policy "insert own roles" on user_roles for insert with check (user_id = auth.uid());

create policy "parent manages own children" on children for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
create policy "coach reads enrolled children" on children for select
  using (coaches_child(id));

create policy "coach manages own subjects" on subjects for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
create policy "anyone authenticated reads subjects" on subjects for select
  using (auth.uid() is not null);

create policy "parent manages own enrollments" on enrollments for all
  using (is_own_child(child_id))
  with check (is_own_child(child_id));
create policy "coach manages enrollments in own subjects" on enrollments for all
  using (exists (select 1 from subjects s where s.id = subject_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = subject_id and s.coach_id = auth.uid()));

create policy "coach manages schedules for own enrollments" on schedules for all
  using (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from enrollments e join subjects s on s.id = e.subject_id
    where e.id = enrollment_id and s.coach_id = auth.uid()
  ));
create policy "parent reads schedules of own children" on schedules for select
  using (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ));

create policy "coach manages attendance for coached children" on attendance for all
  using (coaches_child(child_id))
  with check (coaches_child(child_id));
create policy "parent reads attendance of own children" on attendance for select
  using (is_own_child(child_id));

create policy "coach manages own assignments" on assignments for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
create policy "parent reads assignments of own children" on assignments for select
  using (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ));

create policy "parent manages submissions of own children" on submissions for all
  using (is_own_child(child_id))
  with check (is_own_child(child_id));
create policy "coach reads/updates submissions for coached children" on submissions for all
  using (coaches_child(child_id))
  with check (coaches_child(child_id));

create policy "coach manages own evaluations" on evaluations for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
create policy "parent reads evaluations of own children" on evaluations for select
  using (is_own_child(child_id));

create policy "coach manages benchmarks for own subjects" on benchmarks for all
  using (exists (select 1 from subjects s where s.id = subject_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = subject_id and s.coach_id = auth.uid()));
create policy "anyone authenticated reads benchmarks" on benchmarks for select
  using (auth.uid() is not null);

-- Auto-create profile row on signup ---------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
