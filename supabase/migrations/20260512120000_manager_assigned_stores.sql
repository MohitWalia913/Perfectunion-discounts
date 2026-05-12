-- Store names (Treez location / entity names) managers may view on the discount dashboard.

alter table public.profiles
  add column if not exists assigned_store_names text[] not null default '{}';

comment on column public.profiles.assigned_store_names is
  'For managers: org store names limiting discount visibility. Admins assign via Users. Empty array for admins.';
