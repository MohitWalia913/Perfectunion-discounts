const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateUuidList(
  raw: unknown,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, ids: [] }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "shared_sales_promo_document_ids must be an array of UUID strings" }
  }
  const ids: string[] = []
  for (const x of raw) {
    const s = String(x ?? "").trim()
    if (!s) continue
    if (!UUID_RE.test(s)) {
      return { ok: false, error: `Invalid document id: ${s}` }
    }
    ids.push(s.toLowerCase())
  }
  return { ok: true, ids: [...new Set(ids)] }
}
