-- Staged single-discount edits (from dashboard edit drawer); publish applies PUT to Treez later.

create table public.discount_edit_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled edit draft',
  discount_id text not null,
  payload jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discount_edit_drafts_created_by_idx
  on public.discount_edit_drafts (created_by);

create index discount_edit_drafts_discount_id_idx
  on public.discount_edit_drafts (discount_id);

create index discount_edit_drafts_updated_at_idx
  on public.discount_edit_drafts (updated_at desc);

alter table public.discount_edit_drafts enable row level security;
