-- Marketplace: coaches publish a public profile, parents browse and request directly
-- (separate phase from email-invite flow in 0002 — both can coexist)

create table coach_profiles (
  coach_id uuid primary key references profiles (id) on delete cascade,
  headline text,
  bio text,
  categories category[] not null default '{}',
  years_experience int,
  hourly_rate numeric,
  service_area text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  coach_id uuid not null references profiles (id) on delete cascade,
  category category not null,
  subject_name text not null,
  note text,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table coach_profiles enable row level security;
alter table requests enable row level security;

create policy "anyone reads published coach profiles" on coach_profiles for select
  using (is_published = true or coach_id = auth.uid());
create policy "coach manages own profile" on coach_profiles for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "parent manages own requests" on requests for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
create policy "coach reads/updates requests addressed to them" on requests for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
