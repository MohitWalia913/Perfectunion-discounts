-- Sales Promo docs: metadata in Postgres; document body is stored as TipTap JSON (see later migration).

create table public.sales_promo_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled promo',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_promo_documents_created_by_idx
  on public.sales_promo_documents (created_by);

create index sales_promo_documents_updated_at_idx
  on public.sales_promo_documents (updated_at desc);

create table public.sales_promo_document_shares (
  document_id uuid not null references public.sales_promo_documents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index sales_promo_document_shares_user_idx
  on public.sales_promo_document_shares (user_id);

alter table public.sales_promo_documents enable row level security;
alter table public.sales_promo_document_shares enable row level security;

-- Application uses the service role from Next.js API routes only for these tables.
