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

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const id = await getSessionUserId()
  if (!id) return null
  return getProfileForUser(id)
}

export function assertRole(
  profile: ProfileRow | null,
  allowed: AppRole[],
): profile is ProfileRow {
  return profile !== null && allowed.includes(profile.role)
}
