# Supabase (this repo)

## 1. Create project & run SQL

In the [Supabase dashboard](https://supabase.com/dashboard), open **SQL** → New query and paste `migrations/20250507120000_profiles.sql`, then run it.

## 2. Auth: no email confirmation (for dev / trusted users)

**Authentication** → **Providers** → **Email**: disable **Confirm email** (or use your org’s policy).  
New users created via the dashboard or `email_confirm: true` in the API are treated as confirmed.

## 3. Environment variables

Copy from `env.example` into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the client)

See also: [Supabase + Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).

## 4. Seed the master admin

1. **Authentication** → **Users** → **Add user**: create your first account (email + password).  
   The trigger creates a `profiles` row with role `manager`.

2. Run in **SQL Editor**:

```sql
update public.profiles
set role = 'master_admin'::public.app_role
where email = 'your-email@company.com';
```

Only **one** (or few) `master_admin` accounts should exist. The app does not allow creating `master_admin` via the Users API.

## 5. Local: clean Next cache if routes change

If you delete API routes and see a stale type error, remove `.next` and run `npm run build` again.
