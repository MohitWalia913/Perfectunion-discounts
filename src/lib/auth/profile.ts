import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppRole, ProfileRow } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getProfileForUser(
  userId: string,
  client?: SupabaseClient,
): Promise<ProfileRow | null> {
  const db = client ?? createServiceRoleClient()
  const { data, error } = await db
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .eq("id", userId)
    .maybeSingle()
  if (error || !data) return null
  return data as ProfileRow
}

/** Current user’s profile via the logged-in session + RLS (no service role key). */
export async function getSessionProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .eq("id", user.id)
    .maybeSingle()
  if (error || !data) return null
  return data as ProfileRow
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  return getSessionProfile()
}

export function assertRole(
  profile: ProfileRow | null,
  allowed: AppRole[],
): profile is ProfileRow {
  return profile !== null && allowed.includes(profile.role)
}
