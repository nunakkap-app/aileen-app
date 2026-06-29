-- Parent-initiated flow: parent invites a coach by email for a specific child + subject.
-- Coach accepts -> subject (if needed) + enrollment get created.

create type invitation_status as enum ('pending', 'accepted', 'declined');

create table invitations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  coach_email text not null,
  category category not null,
  subject_name text not null,
  note text,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table invitations enable row level security;

create policy "parent manages own invitations" on invitations for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "coach reads invitations addressed to them" on invitations for select
  using (lower(coach_email) = lower((select email from profiles where id = auth.uid())));

create policy "coach updates invitations addressed to them" on invitations for update
  using (lower(coach_email) = lower((select email from profiles where id = auth.uid())))
  with check (lower(coach_email) = lower((select email from profiles where id = auth.uid())));
