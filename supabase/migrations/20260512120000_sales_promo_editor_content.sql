-- Store Sales Promo document body as Tiptap JSON (replaces Liveblocks-hosted Yjs).

alter table public.sales_promo_documents
  add column if not exists content jsonb not null default '{"type":"doc","content":[]}'::jsonb;
