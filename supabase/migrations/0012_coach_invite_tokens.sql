-- Token-based invite link: parent generates a shareable link, sends to coach via LINE/etc.
-- Coach opens link, signs up/logs in, and claims the enrollment as their own student.

create table coach_claim_tokens (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references profiles(id)
);

grant select, insert, update on coach_claim_tokens to authenticated;
alter table coach_claim_tokens enable row level security;

create policy "parent creates claim token" on coach_claim_tokens for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from enrollments e
      where e.id = enrollment_id and is_own_child(e.child_id)
    )
  );

-- Any authenticated user can read a token by UUID (UUID is 128-bit random, unguessable)
create policy "authenticated read any token" on coach_claim_tokens for select
  using (auth.uid() is not null);

create policy "authenticated claim token" on coach_claim_tokens for update
  using (claimed_at is null)
  with check (claimed_by = auth.uid());

-- Security-definer function so it can update enrollments without the coach owning the child
create or replace function claim_coach_token(p_token_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
  v_subject_name text;
  v_category text;
  v_coach_id uuid := auth.uid();
  v_new_subject_id uuid;
begin
  if v_coach_id is null then
    raise exception 'not authenticated';
  end if;

  select e.id, s.name, s.category
  into v_enrollment_id, v_subject_name, v_category
  from coach_claim_tokens cct
  join enrollments e on e.id = cct.enrollment_id
  join subjects s on s.id = e.subject_id
  where cct.id = p_token_id
    and cct.claimed_at is null;

  if v_enrollment_id is null then
    raise exception 'invalid or already claimed token';
  end if;

  select id into v_new_subject_id
  from subjects
  where coach_id = v_coach_id
    and name = v_subject_name
    and category = v_category
  limit 1;

  if v_new_subject_id is null then
    insert into subjects (coach_id, name, category)
    values (v_coach_id, v_subject_name, v_category)
    returning id into v_new_subject_id;
  end if;

  update enrollments set subject_id = v_new_subject_id where id = v_enrollment_id;

  update coach_claim_tokens
  set claimed_at = now(), claimed_by = v_coach_id
  where id = p_token_id;
end;
$$;

grant execute on function claim_coach_token(uuid) to authenticated;
