-- Let a coach attach a suggested practice schedule to homework (e.g. "ฝึก 15 นาที
-- ทุกวันจันทร์ พุธ ศุกร์") so the parent can take that and set up the actual
-- practice_schedules entry themselves.

alter table assignments add column suggested_weekdays smallint[];
alter table assignments add column suggested_minutes integer;
