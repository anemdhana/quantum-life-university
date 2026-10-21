-- Per-photo layout/editorial guidance for ChatGPT when assembling the PDF.

alter table public.newsletter_assets
  add column if not exists instruction text not null default '';
