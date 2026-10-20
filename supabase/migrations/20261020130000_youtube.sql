-- Optional source video for a day reading.
alter table public.days add column if not exists youtube_id text;
