import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProfileRow } from "@/lib/auth/types"

export async function syncManagerPromoShares(
  admin: SupabaseClient,
  userId: string,
  docIds: string[],
): Promise<void> {
  await admin.from("sales_promo_document_shares").delete().eq("user_id", userId)
  if (!docIds.length) return
  const { data: existing, error: exErr } = await admin
    .from("sales_promo_documents")
    .select("id")
    .in("id", docIds)
  if (exErr) throw new Error(exErr.message)
  const ok = new Set((existing ?? []).map((r) => r.id as string))
  const rows = docIds.filter((id) => ok.has(id)).map((document_id) => ({ document_id, user_id: userId }))
  if (rows.length) {
    const { error } = await admin.from("sales_promo_document_shares").insert(rows)
    if (error) throw new Error(error.message)
  }
}

export type ProfileWithShares = ProfileRow & {
  shared_sales_promo_document_ids: string[]
}

export async function attachPromoShareIds(
  admin: SupabaseClient,
  users: ProfileRow[],
): Promise<ProfileWithShares[]> {
  const managerIds = users.filter((u) => u.role === "manager").map((u) => u.id)
  if (!managerIds.length) {
    return users.map((u) => ({ ...u, shared_sales_promo_document_ids: [] as string[] }))
  }
  const { data: shareRows, error } = await admin
    .from("sales_promo_document_shares")
    .select("user_id, document_id")
    .in("user_id", managerIds)
  if (error) {
    return users.map((u) => ({ ...u, shared_sales_promo_document_ids: [] as string[] }))
  }
  const byUser = new Map<string, string[]>()
  for (const r of shareRows ?? []) {
    const uid = r.user_id as string
    const did = r.document_id as string
    const arr = byUser.get(uid) ?? []
    arr.push(did)
    byUser.set(uid, arr)
  }
  return users.map((u) => ({
    ...u,
    shared_sales_promo_document_ids: [...new Set(byUser.get(u.id) ?? [])].sort(),
  }))
}
