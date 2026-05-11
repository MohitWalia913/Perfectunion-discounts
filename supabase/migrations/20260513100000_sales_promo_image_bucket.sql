-- Public read bucket for Sales Promo editor images (uploads go through Next.js API + service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sales-promo-images',
  'sales-promo-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read sales promo images" on storage.objects;

create policy "Public read sales promo images"
on storage.objects
for select
to public
using (bucket_id = 'sales-promo-images');
