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
    .select("id,email,full_name,role,created_at,assigned_store_names")
    .eq("id", userId)
    .maybeSingle()
  if (error || !data) return null
  return normalizeProfileRow(data)
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
    .select("id,email,full_name,role,created_at,assigned_store_names")
    .eq("id", user.id)
    .maybeSingle()
  if (error || !data) return null
  return normalizeProfileRow(data)
}

export function normalizeProfileRow(data: Record<string, unknown>): ProfileRow {
  const names = data.assigned_store_names
  const assigned_store_names = Array.isArray(names)
    ? names.map((x) => String(x ?? "").trim()).filter(Boolean)
    : []
  return {
    id: String(data.id),
    email: data.email === null || data.email === undefined ? null : String(data.email),
    full_name:
      data.full_name === null || data.full_name === undefined ? null : String(data.full_name),
    role: data.role as ProfileRow["role"],
    created_at: String(data.created_at ?? ""),
    assigned_store_names,
  }
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
