-- Allow more than one parent per child. The parent who creates the child becomes
-- the "owner" and can invite other parents (by email) and choose which child
-- they get access to. Every other RLS policy in the app already keys off
-- is_own_child(), so we redefine that one function to check guardianship
-- membership instead of children.parent_id — every existing policy picks this
-- up automatically without touching them one by one.

create table child_guardians (
  child_id uuid not null references children (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (child_id, user_id)
);

grant select, insert, update, delete on child_guardians to authenticated;
alter table child_guardians enable row level security;

create or replace function is_child_guardian(target_child_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from child_guardians where child_id = target_child_id and user_id = auth.uid()
  );
$$;

create or replace function is_child_owner(target_child_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from child_guardians where child_id = target_child_id and user_id = auth.uid() and is_owner = true
  );
$$;

create policy "guardians read own child_guardians" on child_guardians for select
  using (is_child_guardian(child_id));

create policy "owner adds guardians" on child_guardians for insert
  with check (is_child_owner(child_id));

create policy "owner removes guardians" on child_guardians for delete
  using (is_child_owner(child_id));

-- Backfill: the existing parent_id on each child becomes the owner guardian.
insert into child_guardians (child_id, user_id, is_owner)
select id, parent_id, true from children
on conflict do nothing;

-- Redefine is_own_child to mean "any guardian of this child", not just the
-- original parent_id. Every policy across the app that calls is_own_child()
-- now respects multi-parent access automatically.
create or replace function is_own_child(target_child_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select is_child_guardian(target_child_id);
$$;

drop policy "parent manages own children" on children;
create policy "guardians manage own children" on children for all
  using (is_own_child(id))
  with check (is_own_child(id));

-- Invite another parent (by email) and grant them access to a specific child.
create table parent_invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children (id) on delete cascade,
  invited_by uuid not null references profiles (id) on delete cascade,
  invitee_email text not null,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

grant select, insert, update, delete on parent_invitations to authenticated;
alter table parent_invitations enable row level security;

create policy "owner manages parent invitations" on parent_invitations for all
  using (is_child_owner(child_id))
  with check (is_child_owner(child_id));

create policy "invitee reads invitations addressed to them" on parent_invitations for select
  using (lower(invitee_email) = lower((select email from profiles where id = auth.uid())));

create policy "invitee responds to invitations addressed to them" on parent_invitations for update
  using (lower(invitee_email) = lower((select email from profiles where id = auth.uid())))
  with check (lower(invitee_email) = lower((select email from profiles where id = auth.uid())));
