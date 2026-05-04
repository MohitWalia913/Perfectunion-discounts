import {
  getDiscountActive,
  getDiscountAmount,
  getDiscountCart,
  getDiscountMethod,
  getDiscountRowId,
  getDiscountTitle,
  type DiscountRow,
} from "@/lib/discount-fields"

export type DetailPair = { label: string; value: string }

export type DetailSection = { title: string; pairs: DetailPair[] }

export function getStoreNamesFromRow(row: DiscountRow): string[] {
  const sc = row.storeCustomizations
  if (!Array.isArray(sc)) return []
  const names: string[] = []
  for (const entry of sc) {
    if (entry && typeof entry === "object" && "entityName" in entry) {
      const n = (entry as { entityName?: unknown }).entityName
      if (typeof n === "string" && n.trim()) names.push(n.trim())
    }
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
}

export function collectAllStoreNames(rows: DiscountRow[]): string[] {
  const s = new Set<string>()
  for (const r of rows) {
    for (const n of getStoreNamesFromRow(r)) s.add(n)
  }
  return [...s].sort((a, b) => a.localeCompare(b))
}

function collectionNames(row: DiscountRow, key: "collections" | "collectionsRequired"): string[] {
  const arr = row[key]
  if (!Array.isArray(arr)) return []
  const out: string[] = []
  for (const c of arr) {
    if (c && typeof c === "object" && "productCollectionName" in c) {
      const n = (c as { productCollectionName?: unknown }).productCollectionName
      if (typeof n === "string" && n.trim()) out.push(n.trim())
    }
  }
  return [...new Set(out)]
}

function summarizeSchedule(s: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof s.startDate === "string") parts.push(`Start ${s.startDate}`)
  if (typeof s.endDate === "string") parts.push(`End ${s.endDate}`)
  if (typeof s.repeatType === "string") parts.push(`Repeat: ${s.repeatType}`)
  if (typeof s.allDay === "boolean") parts.push(s.allDay ? "All day" : "Timed")
  return parts.join(" · ") || "Scheduled"
}

function summarizeConditions(cond: Record<string, unknown>): string {
  const bogo = cond.bogoConditions
  if (bogo && typeof bogo === "object") {
    const b = bogo as Record<string, unknown>
    const buy = b.buyCount
    const get = b.getCount
    const unit = b.discountUnit
    return `BOGO${buy != null || get != null ? `: buy ${buy ?? "?"} / get ${get ?? "?"}` : ""}${unit != null ? ` (${String(unit)})` : ""}`.trim()
  }
  const bundle = cond.bundleConditions
  if (bundle && typeof bundle === "object") {
    const b = bundle as Record<string, unknown>
    return `Bundle${b.buyCount != null ? ` · buy ${String(b.buyCount)}` : ""}${b.discountUnit != null ? ` · ${String(b.discountUnit)}` : ""}`.trim()
  }
  return "Conditions attached"
}

export function buildReadableDiscountSections(row: DiscountRow): DetailSection[] {
  const sections: DetailSection[] = []

  const overview: DetailPair[] = [
    { label: "Discount ID", value: getDiscountRowId(row) || "—" },
    { label: "Title", value: getDiscountTitle(row) },
    { label: "Type", value: getDiscountMethod(row) || "—" },
    { label: "Amount", value: getDiscountAmount(row) },
  ]
  const active = getDiscountActive(row)
  overview.push({
    label: "Status",
    value: active === null ? "Unknown" : active ? "Active" : "Inactive",
  })
  const cart = getDiscountCart(row)
  overview.push({
    label: "Scope",
    value: cart === null ? "—" : cart ? "Cart-level" : "Line / item",
  })
  if (typeof row.organizationId === "string" && row.organizationId) {
    overview.push({ label: "Organization", value: row.organizationId })
  }
  if (typeof row.isManual === "boolean") {
    overview.push({ label: "Manual discount", value: row.isManual ? "Yes" : "No" })
  }
  if (typeof row.isStackable === "boolean") {
    overview.push({ label: "Stackable", value: row.isStackable ? "Yes" : "No" })
  }
  if (typeof row.requireCoupon === "boolean" && row.requireCoupon) {
    overview.push({ label: "Requires coupon", value: "Yes" })
  }
  sections.push({ title: "Overview", pairs: overview })

  const stores = getStoreNamesFromRow(row)
  if (stores.length) {
    sections.push({
      title: "Stores",
      pairs: stores.map((name) => ({ label: "Location", value: name })),
    })
  }

  const col = collectionNames(row, "collections")
  if (col.length) {
    sections.push({
      title: "Product collections",
      pairs: col.map((name) => ({ label: "Collection", value: name })),
    })
  }
  const req = collectionNames(row, "collectionsRequired")
  if (req.length) {
    sections.push({
      title: "Required collections",
      pairs: req.map((name) => ({ label: "Required", value: name })),
    })
  }

  if (row.schedule && typeof row.schedule === "object") {
    sections.push({
      title: "Schedule",
      pairs: [{ label: "Summary", value: summarizeSchedule(row.schedule as Record<string, unknown>) }],
    })
  }

  if (row.conditions && typeof row.conditions === "object") {
    const text = summarizeConditions(row.conditions as Record<string, unknown>)
    sections.push({
      title: "Conditions",
      pairs: [{ label: "Summary", value: text }],
    })
  }

  if (Array.isArray(row.coupons) && row.coupons.length) {
    const pairs: DetailPair[] = []
    for (const c of row.coupons) {
      if (c && typeof c === "object" && "code" in c) {
        const code = (c as { code?: unknown }).code
        const title = (c as { title?: unknown }).title
        pairs.push({
          label: typeof title === "string" ? title : "Coupon",
          value: typeof code === "string" ? code : "—",
        })
      }
    }
    if (pairs.length) sections.push({ title: "Coupons", pairs })
  }

  const created = row.createdAt ?? row.created_at
  const updated = row.updatedAt ?? row.updated_at
  const meta: DetailPair[] = []
  if (typeof created === "string") meta.push({ label: "Created", value: created })
  if (typeof updated === "string") meta.push({ label: "Updated", value: updated })
  if (meta.length) sections.push({ title: "Record", pairs: meta })

  return sections
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
