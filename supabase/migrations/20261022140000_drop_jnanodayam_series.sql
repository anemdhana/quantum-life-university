-- Readings live under Devi Navaratrula Jnanam. Drop the unused Jnanodayam series.

delete from public.user_progress
where series_slug = 'jnanodayam';

delete from public.sections
where day_id in (
  select d.id
  from public.days d
  join public.series s on s.id = d.series_id
  where s.slug = 'jnanodayam'
);

delete from public.days
where series_id in (select id from public.series where slug = 'jnanodayam');

delete from public.series
where slug = 'jnanodayam';
