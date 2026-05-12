import { fetchOrgStores, getTreezEnv } from "@/lib/treez"
import { parseOrgStoreNamesFromTreezPayload } from "@/lib/org-store-names"

export async function normalizeAndValidateManagerStoreNames(
  incoming: unknown,
): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  if (!Array.isArray(incoming)) {
    return { ok: false, error: "assigned_store_names must be an array of store name strings" }
  }
  const raw = [...new Set(incoming.map((x) => String(x ?? "").trim()).filter(Boolean))]
  if (raw.length === 0) {
    return { ok: false, error: "Select at least one store location for a manager" }
  }
  let body: unknown
  try {
    body = await fetchOrgStores(getTreezEnv())
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not load organization stores from Treez",
    }
  }
  const allowed = new Set(parseOrgStoreNamesFromTreezPayload(body))
  for (const n of raw) {
    if (!allowed.has(n)) {
      return { ok: false, error: `Store name is not in your organization catalog: ${n}` }
    }
  }
  return { ok: true, names: [...raw].sort((a, b) => a.localeCompare(b)) }
}
