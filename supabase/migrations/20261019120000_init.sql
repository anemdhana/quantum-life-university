-- Self Knowledge Reading — Supabase Schema
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. Profiles
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Days
-- ============================================================
create table if not exists public.days (
  id          serial primary key,
  day_number  int not null check (day_number between 1 and 9),
  title       text not null,
  subtitle    text,
  language    text not null default 'te' check (language in ('te', 'en', 'kn', 'hi')),
  published   boolean default true,
  created_at  timestamptz default now(),
  -- One row per language so Day 8 Telugu and English can both exist.
  unique (day_number, language)
);

-- ============================================================
-- 3. Sections
-- ============================================================
create table if not exists public.sections (
  id            uuid primary key default gen_random_uuid(),
  day_id        int not null references public.days(id) on delete cascade,
  section_order int not null,
  title         text not null,
  content       jsonb not null,
  minutes       int,
  updated_at    timestamptz default now(),
  updated_by    uuid references public.profiles(id),
  unique (day_id, section_order)
);

-- ============================================================
-- 4. User Progress (Resume)
-- ============================================================
create table if not exists public.user_progress (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  day_number    int not null,
  language      text not null default 'te' check (language in ('te', 'en', 'kn', 'hi')),
  section_id    uuid references public.sections(id),
  section_order int,
  spread_index  int default 0,
  updated_at    timestamptz default now()
);

-- ============================================================
-- 5. Highlights
-- ============================================================
create table if not exists public.highlights (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  day_number     int not null,
  section_id     uuid not null references public.sections(id) on delete cascade,
  selected_text  text not null,
  start_offset   int,
  end_offset     int,
  color          text default 'gold',
  note_text      text,
  voice_note_url text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists highlights_user_id_idx on public.highlights(user_id);
create index if not exists highlights_section_id_idx on public.highlights(section_id);

-- ============================================================
-- 6. Bookmarks
-- ============================================================
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day_number  int not null,
  section_id  uuid not null references public.sections(id) on delete cascade,
  label       text,
  created_at  timestamptz default now(),
  unique (user_id, section_id)
);

-- ============================================================
-- 7. Helpers
-- ============================================================
-- security definer so admin checks do not recurse through profiles RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 8. Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.days enable row level security;
alter table public.sections enable row level security;
alter table public.user_progress enable row level security;
alter table public.highlights enable row level security;
alter table public.bookmarks enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Anyone can read published days" on public.days;
drop policy if exists "Admins can manage days" on public.days;
drop policy if exists "Anyone can read sections of published days" on public.sections;
drop policy if exists "Admins can manage sections" on public.sections;
drop policy if exists "Users manage own progress" on public.user_progress;
drop policy if exists "Users manage own highlights" on public.highlights;
drop policy if exists "Users manage own bookmarks" on public.bookmarks;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Days & Sections (public read)
create policy "Anyone can read published days"
  on public.days for select
  using (published = true);

create policy "Admins can manage days"
  on public.days for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can read sections of published days"
  on public.sections for select
  using (
    exists (
      select 1 from public.days
      where days.id = sections.day_id and days.published = true
    )
  );

-- Admin write on sections
create policy "Admins can manage sections"
  on public.sections for all
  using (public.is_admin())
  with check (public.is_admin());

-- User progress
create policy "Users manage own progress"
  on public.user_progress for all
  using (auth.uid() = user_id);

-- Highlights
create policy "Users manage own highlights"
  on public.highlights for all
  using (auth.uid() = user_id);

-- Bookmarks
create policy "Users manage own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id);

-- ============================================================
-- 9. API grants (Supabase does not auto-grant new tables)
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.days, public.sections to anon;
grant select, insert, update, delete on public.days, public.sections to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;
grant select, insert, update, delete on public.highlights to authenticated;
grant select, insert, update, delete on public.bookmarks to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================
-- 10. Storage bucket for voice notes (run separately if needed)
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('voice-notes', 'voice-notes', false);

-- Storage policies would be added via Supabase dashboard or additional SQL.
