-- Let parents (not just coaches) create/manage schedules for their own children's enrollments.

create policy "parent manages schedules of own children" on schedules for all
  using (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ))
  with check (exists (
    select 1 from enrollments e where e.id = enrollment_id and is_own_child(e.child_id)
  ));
