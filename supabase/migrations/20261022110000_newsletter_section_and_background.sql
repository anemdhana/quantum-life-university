-- Section-level layout instructions + per-photo background-image flag.

alter table public.newsletter_assets
  add column if not exists use_as_background boolean not null default false;

create table if not exists public.newsletter_section_settings (
  title       text primary key,
  instruction text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.newsletter_section_settings enable row level security;

drop policy if exists "Admins manage newsletter section settings" on public.newsletter_section_settings;
create policy "Admins manage newsletter section settings"
  on public.newsletter_section_settings for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.newsletter_section_settings to authenticated;
