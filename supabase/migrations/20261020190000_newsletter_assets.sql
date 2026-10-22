-- Newsletter editorial assets (photos + captions for monthly PDF)

create table if not exists public.newsletter_assets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  label       text not null,
  summary     text not null default '',
  instruction text not null default '',
  summary_instruction text not null default '',
  use_as_background boolean not null default false,
  image_url   text not null,
  taken_on    date not null default (current_date),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists newsletter_assets_taken_on_idx
  on public.newsletter_assets (taken_on desc);

create index if not exists newsletter_assets_created_at_idx
  on public.newsletter_assets (created_at desc);

alter table public.newsletter_assets enable row level security;

drop policy if exists "Admins manage newsletter assets" on public.newsletter_assets;
create policy "Admins manage newsletter assets"
  on public.newsletter_assets for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.newsletter_assets to authenticated;
