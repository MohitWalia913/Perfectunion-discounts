import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppRole } from "@/lib/auth/types"
import type { ProfileRow } from "@/lib/auth/types"

export function isSalesPromoAdminRole(role: AppRole): boolean {
  return role === "master_admin" || role === "admin"
}

export async function userCanAccessSalesPromoDocument(
  admin: SupabaseClient,
  profile: ProfileRow,
  documentId: string,
): Promise<boolean> {
  if (isSalesPromoAdminRole(profile.role)) {
    const { data, error } = await admin
      .from("sales_promo_documents")
      .select("id")
      .eq("id", documentId)
      .maybeSingle()
    if (error) return false
    return !!data
  }

  if (profile.role !== "manager") return false

  const { data, error } = await admin
    .from("sales_promo_document_shares")
    .select("document_id")
    .eq("document_id", documentId)
    .eq("user_id", profile.id)
    .maybeSingle()

  if (error) return false
  return !!data
}
