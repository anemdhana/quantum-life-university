-- Dynamic series. A day number belongs to a series, so one programme's day 8
-- and another session's day 8 can both exist.

create table if not exists public.series (
  id         serial primary key,
  slug       text not null unique,
  name       text not null,
  created_at timestamptz default now()
);

alter table public.days add column if not exists series_id int references public.series(id);
alter table public.days add column if not exists cover_url text;
alter table public.user_progress add column if not exists series_slug text;

insert into public.series (slug, name)
values
  ('jnanodayam', 'Jnanodayam'),
  ('devi-navaratrula-jnanam', 'Devi Navaratrula Jnanam')
on conflict (slug) do nothing;

update public.days d
set series_id = s.id
from public.series s
where d.series_id is null
  and s.slug = case
    when d.title like '%నవరాత్రుల జ్ఞానం%' or d.day_number in (7, 8) then 'devi-navaratrula-jnanam'
    else 'jnanodayam'
  end;

alter table public.days alter column series_id set not null;

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.days'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.days drop constraint %I', r.conname);
  end loop;

  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.days'::regclass
      and contype = 'u'
      and conname <> 'days_pkey'
  loop
    execute format('alter table public.days drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.days
  add constraint days_day_number_check check (day_number between 1 and 31);

alter table public.days
  add constraint days_language_check check (language in ('te', 'en'));

alter table public.days
  add constraint days_series_day_language_key unique (series_id, day_number, language);

alter table public.series enable row level security;

drop policy if exists "Anyone can read series" on public.series;
drop policy if exists "Admins can manage series" on public.series;

create policy "Anyone can read series"
  on public.series for select
  using (true);

create policy "Admins can manage series"
  on public.series for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.series to anon, authenticated;
grant insert, update, delete on public.series to authenticated;
grant usage, select on sequence public.series_id_seq to authenticated;
