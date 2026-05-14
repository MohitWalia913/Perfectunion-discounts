import type { DiscountRow } from "@/lib/discount-fields"
import {
  getDiscountActive,
  getDiscountAmount,
  getDiscountMethod,
  getDiscountRowId,
  getDiscountTitle,
  getScheduleEndDateISO,
  getScheduleRepeatType,
  getScheduleStartDateISO,
  normalizeMethodTab,
} from "@/lib/discount-fields"
import {
  type BulkDiscountRow,
  type ProductCollection,
  type StoreEntity,
  parseIsoDate,
  recomputeRowMeta,
} from "@/lib/bulk-discount-io"

function matchStore(
  entityId: string,
  entityName: string,
  catalog: StoreEntity[],
): StoreEntity {
  const id = entityId.trim()
  const name = entityName.trim()
  const byId = id ? catalog.find((s) => s.id === id) : undefined
  if (byId) return byId
  const byName = name ? catalog.find((s) => s.name.trim() === name) : undefined
  if (byName) return byName
  if (id && name) return { id, name }
  return { id: id || name, name: name || id }
}

function matchCollection(
  colId: string,
  colName: string,
  catalog: ProductCollection[],
): ProductCollection {
  const id = colId.trim()
  const name = colName.trim()
  const byId = id ? catalog.find((c) => c.id === id) : undefined
  if (byId) return byId
  const byName = name ? catalog.find((c) => c.name.trim() === name) : undefined
  if (byName) return byName
  if (id && name) return { id, name }
  return { id: id || name, name: name || id }
}

/** One live Treez discount row → bulk grid row (CUSTOM title pattern). */
export function treezDiscountToBulkRow(
  row: Record<string, unknown>,
  catalogStores: StoreEntity[],
  catalogCollections: ProductCollection[],
): BulkDiscountRow {
  const dr = row as DiscountRow

  const selectedStores: StoreEntity[] = []
  const sc = row.storeCustomizations
  if (Array.isArray(sc)) {
    for (const e of sc) {
      if (!e || typeof e !== "object") continue
      const o = e as Record<string, unknown>
      const eid = String(o.entityId ?? "").trim()
      const ename = String(o.entityName ?? "").trim()
      if (!eid && !ename) continue
      selectedStores.push(matchStore(eid, ename, catalogStores))
    }
  }

  const selectedCollections: ProductCollection[] = []
  const cols = row.collections
  if (Array.isArray(cols)) {
    for (const c of cols) {
      if (!c || typeof c !== "object") continue
      const o = c as Record<string, unknown>
      const pid = String(o.productCollectionId ?? o.collectionId ?? o.id ?? "").trim()
      const pname = String(o.productCollectionName ?? o.name ?? o.title ?? "").trim()
      if (!pid && !pname) continue
      selectedCollections.push(matchCollection(pid, pname, catalogCollections))
    }
  }

  const startStr = getScheduleStartDateISO(dr)
  let startDate = startStr ? parseIsoDate(`${startStr}T12:00:00`) : undefined
  if (!startDate) startDate = new Date()

  const endStr = getScheduleEndDateISO(dr)
  const endDate = endStr ? parseIsoDate(`${endStr}T12:00:00`) : undefined

  const rt = getScheduleRepeatType(dr)
  const repeatType: BulkDiscountRow["repeatType"] =
    rt === "DAY" || rt === "WEEK" || rt === "MONTH" ? rt : "DO_NOT"
  const repeat = repeatType !== "DO_NOT"

  let amount = getDiscountAmount(dr)
  if (!amount || amount === "—") {
    amount = row.amount != null ? String(row.amount).trim() : ""
  }

  const treezId = getDiscountRowId(dr).trim()
  let treezPutBase: Record<string, unknown> | null = null
  try {
    treezPutBase = JSON.parse(JSON.stringify(row)) as Record<string, unknown>
  } catch {
    treezPutBase = { ...(row as Record<string, unknown>) }
  }

  const base: BulkDiscountRow = {
    id: crypto.randomUUID(),
    discountType: "CUSTOM",
    title: "",
    customTitle: getDiscountTitle(dr),
    amount,
    selectedStores,
    startDate,
    endDate,
    repeat,
    repeatType: repeat ? repeatType : "DO_NOT",
    selectedCollections,
    isValid: false,
    scheduledPublishDate: null,
    publishedAt: null,
    publishError: null,
    treezDiscountId: treezId || null,
    treezPutBase,
  }

  return recomputeRowMeta(base)
}

/** Active + PERCENT-only discounts from the Treez list → bulk rows. */
export function exportActivePercentDiscountsToBulkRows(
  treezRows: Record<string, unknown>[],
  catalogStores: StoreEntity[],
  catalogCollections: ProductCollection[],
): BulkDiscountRow[] {
  const out: BulkDiscountRow[] = []
  for (const row of treezRows) {
    if (normalizeMethodTab(getDiscountMethod(row as DiscountRow)) !== "PERCENT") continue
    const active = getDiscountActive(row as DiscountRow)
    if (active !== true) continue
    out.push(treezDiscountToBulkRow(row, catalogStores, catalogCollections))
  }
  return out
}
