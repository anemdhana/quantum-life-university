-- Per-photo guidance for how Summary/topic text should be presented in the PDF.

alter table public.newsletter_assets
  add column if not exists summary_instruction text not null default '';
