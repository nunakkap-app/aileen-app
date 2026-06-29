-- Let a parent fill in a coach's schedule/sessions on the coach's behalf when
-- that coach doesn't have an account yet. The subject is still owned by the
-- parent's own coach_id (so existing RLS just works), but we record the real
-- coach's name so the UI can show "ครู: ชื่อ (ผปค.กรอกแทน)" instead of the parent's own name.

alter table subjects add column placeholder_coach_name text;
