-- Saved bulk-create grids; publish to Treez later (manual or scheduled cron).

create table public.bulk_discount_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled draft',
  /** Serialized bulk rows (dates as ISO strings); see `bulk-discount-io` in app. */
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bulk_discount_drafts_created_by_idx
  on public.bulk_discount_drafts (created_by);

create index bulk_discount_drafts_updated_at_idx
  on public.bulk_discount_drafts (updated_at desc);

alter table public.bulk_discount_drafts enable row level security;
