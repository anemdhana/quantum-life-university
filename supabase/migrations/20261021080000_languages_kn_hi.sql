-- Allow Kannada (kn) and Hindi (hi) day / progress language codes.

alter table public.days drop constraint if exists days_language_check;
alter table public.days
  add constraint days_language_check check (language in ('te', 'en', 'kn', 'hi'));

alter table public.user_progress drop constraint if exists user_progress_language_check;
alter table public.user_progress
  add constraint user_progress_language_check check (language in ('te', 'en', 'kn', 'hi'));
