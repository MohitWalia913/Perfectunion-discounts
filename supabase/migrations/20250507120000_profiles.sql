-- App roles: master_admin (seeded), admin, manager
create type public.app_role as enum ('master_admin', 'admin', 'manager');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

-- Users can read their own profile (session from Supabase Auth)
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- New signups get a profile row from trigger (default manager)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'manager'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- After creating your first auth user, promote them in SQL Editor:
-- update public.profiles set role = 'master_admin' where email = 'you@company.com';
