/** Normalize Treez organization-entity API payloads into trimmed store display names. */

export function parseOrgStoreNamesFromTreezPayload(body: unknown): string[] {
  let storesData: unknown = body
  if (storesData && typeof storesData === "object" && !Array.isArray(storesData)) {
    const o = storesData as Record<string, unknown>
    storesData = o.data ?? o.entities ?? o.results ?? []
  }
  if (!Array.isArray(storesData)) return []

  const names = new Set<string>()
  for (const s of storesData) {
    if (!s || typeof s !== "object") continue
    const r = s as Record<string, unknown>
    const name = String(
      r.name ?? r.displayName ?? r.entityName ?? r.organizationEntityName ?? "",
    ).trim()
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
