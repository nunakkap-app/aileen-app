-- Add reference material to assignments and full submission capabilities (timer + media).

alter table assignments
  add column if not exists reference_url text,
  add column if not exists reference_text text;

alter table submissions
  add column if not exists timer_status text not null default 'idle',
  add column if not exists running_since timestamptz,
  add column if not exists elapsed_seconds int not null default 0,
  add column if not exists media_url text;
