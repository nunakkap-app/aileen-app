-- "Automatically expose new tables" was disabled at project creation, so the
-- `authenticated` role has no base table privileges yet. RLS policies only take
-- effect once the underlying GRANT exists, so add it explicitly here.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  profiles,
  user_roles,
  children,
  subjects,
  enrollments,
  schedules,
  attendance,
  assignments,
  submissions,
  evaluations,
  benchmarks,
  invitations,
  coach_profiles,
  requests
to authenticated;
