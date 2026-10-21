-- Allow "Global Assets" as a cross-section inventory title (default in admin UI).

alter table public.newsletter_assets drop constraint if exists newsletter_assets_title_check;

alter table public.newsletter_assets
  add constraint newsletter_assets_title_check
  check (title in (
    'Global Assets',
    'Summary of the themes covered in that month',
    'Highlight classes of the month',
    'Few Experiences from Participants',
    'Dr. Newton''s visits and classes in other places',
    'Vanya Maitreya Highlights',
    'Goloka, Sahasrara and QLU Updates',
    'Upcoming Programs/Announcements'
  ));
