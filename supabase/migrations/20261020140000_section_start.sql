-- Listen start time for a whole section (from YouTube captions).
alter table public.sections add column if not exists start_sec int;
