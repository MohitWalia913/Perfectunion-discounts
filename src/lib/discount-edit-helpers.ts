import type { DiscountRow } from "@/lib/discount-fields"
import {
  getDiscountAmount,
  getDiscountTitle,
  getScheduleEndDateISO,
  getScheduleStartDateISO,
} from "@/lib/discount-fields"

export type StoreEntityDraft = { id: string; name: string }

export type CollectionEntityDraft = { id: string; name: string }

/** Matches bulk-upload schedule repeat behavior */
export type EditScheduleRepeatType = "DAY" | "WEEK" | "MONTH" | "DO_NOT"

export type DiscountEditDraft = {
  title: string
  amount: string
  stores: StoreEntityDraft[]
  collections: CollectionEntityDraft[]
  /** YYYY-MM-DD or empty */
  startDate: string
  endDate: string
  /** When false, Treez `repeatType` is `DO_NOT` (same as bulk “No”). */
  repeat: boolean
  repeatType: EditScheduleRepeatType
}

function resolveStoreId(
  entry: Record<string, unknown>,
  entityByName: Map<string, string>,
): string {
  const id =
    entry.entityId ??
    entry.organizationEntityId ??
    entry.id ??
    entry.entity_id
  if (id != null && String(id).trim()) return String(id).trim()
  const name = entry.entityName ?? entry.entity_name ?? entry.name
  if (typeof name === "string" && name.trim()) {
    const hit = entityByName.get(name.trim().toLowerCase())
    if (hit) return hit
  }
  return ""
}

export function buildEntityNameMap(entities: StoreEntityDraft[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of entities) {
    m.set(e.name.trim().toLowerCase(), e.id)
  }
  return m
}

export function rowToEditDraft(
  row: DiscountRow,
  catalogStores: StoreEntityDraft[],
): DiscountEditDraft {
  const entityByName = buildEntityNameMap(catalogStores)
  const stores: StoreEntityDraft[] = []
  const sc = row.storeCustomizations
  if (Array.isArray(sc)) {
    for (const e of sc) {
      if (!e || typeof e !== "object") continue
      const o = e as Record<string, unknown>
      const nameRaw =
        typeof o.entityName === "string"
          ? o.entityName.trim()
          : typeof o.entity_name === "string"
            ? String(o.entity_name).trim()
            : ""
      let id = resolveStoreId(o, entityByName)
      if (!id && nameRaw) id = entityByName.get(nameRaw.toLowerCase()) ?? ""
      if (!id && nameRaw)
        stores.push({ id: `name:${nameRaw}`, name: nameRaw })
      else if (id) stores.push({ id, name: nameRaw || id })
    }
  }

  const collections: CollectionEntityDraft[] = []
  const cols = row.collections
  if (Array.isArray(cols)) {
    for (const c of cols) {
      if (!c || typeof c !== "object") continue
      const o = c as Record<string, unknown>
      const id = String(o.productCollectionId ?? o.collectionId ?? o.id ?? "").trim()
      const name =
        typeof o.productCollectionName === "string"
          ? o.productCollectionName.trim()
          : typeof o.name === "string"
            ? o.name.trim()
            : ""
      if (id) collections.push({ id, name: name || id })
    }
  }

  const start = getScheduleStartDateISO(row) ?? ""
  const end = getScheduleEndDateISO(row) ?? ""

  let amount = getDiscountAmount(row)
  if (amount === "—") amount = ""

  const sched =
    row.schedule && typeof row.schedule === "object"
      ? (row.schedule as Record<string, unknown>)
      : {}
  const rtRaw = sched.repeatType
  const repeatTypeParsed: EditScheduleRepeatType =
    rtRaw === "DAY" || rtRaw === "WEEK" || rtRaw === "MONTH" || rtRaw === "DO_NOT"
      ? rtRaw
      : "DO_NOT"
  const repeat = repeatTypeParsed !== "DO_NOT"

  return {
    title: getDiscountTitle(row) ?? "",
    amount,
    stores,
    collections,
    startDate: start,
    endDate: end,
    repeat,
    repeatType: repeatTypeParsed,
  }
}

/**
 * Treez PUT `/v3/discount` OpenAPI marks these `conditions` booleans as required.
 * GET often returns a sparse `conditions` object; merging avoids 422 on update.
 */
export const TREEZ_CONDITIONS_PUT_DEFAULTS: Record<string, boolean> = {
  customerCapEnabled: false,
  purchaseMinimumEnabled: false,
  customerEventEnabled: false,
  itemLimitEnabled: false,
  fulfillmentTypesEnabled: false,
  customerLicenseTypeEnabled: false,
  customerLimitEnabled: false,
  packageAgeEnabled: false,
}

export const TREEZ_MANUAL_CONDITIONS_PUT_DEFAULTS: Record<string, boolean> = {
  customerCapEnabled: false,
  purchaseMinimumEnabled: false,
  itemLimitEnabled: false,
  fulfillmentTypesEnabled: false,
}

/** Merge draft into a PUT payload matching existing discount-manager stripping rules */
export function mergeRowWithEditDraft(row: DiscountRow, draft: DiscountEditDraft): Record<string, unknown> {
  const { createdAt, updatedAt, ...cleanRow } = row as DiscountRow & Record<string, unknown>

  const storePayload = draft.stores
    .filter((s) => s.id && !s.id.startsWith("name:"))
    .map((s) => ({ entityId: s.id }))

  const collectionPayload = draft.collections.map((c) => ({
    productCollectionId: c.id,
  }))

  const prevSchedule =
    row.schedule && typeof row.schedule === "object"
      ? (row.schedule as Record<string, unknown>)
      : {}

  const stripSchedMeta = ({ createdAt: _c, updatedAt: _u, id: _i, ...rest }: Record<string, unknown>) =>
    rest

  const schedClean = stripSchedMeta({ ...prevSchedule })

  const startDate =
    draft.startDate.trim() ||
    (typeof schedClean.startDate === "string" ? schedClean.startDate : "") ||
    (typeof schedClean.start === "string" ? String(schedClean.start).split("T")[0] : "") ||
    ""

  let endDate = draft.endDate.trim()
  if (!endDate && typeof schedClean.endDate === "string") endDate = String(schedClean.endDate).split("T")[0]
  if (!endDate && typeof schedClean.end === "string") endDate = String(schedClean.end).split("T")[0]
  if (!endDate && startDate) endDate = startDate

  const scheduleOut: Record<string, unknown> = {
    ...schedClean,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    startTime: typeof schedClean.startTime === "string" ? schedClean.startTime : "00:00:00",
    endTime: typeof schedClean.endTime === "string" ? schedClean.endTime : "23:59:59",
    allDay: typeof schedClean.allDay === "boolean" ? schedClean.allDay : true,
    spansMultipleDays: typeof schedClean.spansMultipleDays === "boolean" ? schedClean.spansMultipleDays : false,
    repeatType: draft.repeat
      ? draft.repeatType === "DO_NOT"
        ? "DAY"
        : draft.repeatType
      : "DO_NOT",
  }

  const prevConditions =
    row.conditions && typeof row.conditions === "object"
      ? (row.conditions as Record<string, unknown>)
      : {}

  const stripCondMeta = ({
    createdAt: _c,
    updatedAt: _u,
    id: _i,
    ...rest
  }: Record<string, unknown>) => rest

  /** Preserve Treez rule payload; ensure required condition flags exist for PUT validation. */
  const conditionsOut: Record<string, unknown> = {
    ...TREEZ_CONDITIONS_PUT_DEFAULTS,
    ...stripCondMeta({ ...prevConditions }),
  }

  const updatedDiscount: Record<string, unknown> = {
    ...(cleanRow as Record<string, unknown>),
    title: draft.title.trim() || getDiscountTitle(row),
    amount: draft.amount.trim() || getDiscountAmount(row),
    storeCustomizations: storePayload.length > 0 ? storePayload : [],
    collections: collectionPayload.length > 0 ? collectionPayload : [],
    schedule: scheduleOut,
    conditions: conditionsOut,
  }

  if (updatedDiscount.manualConditions && typeof updatedDiscount.manualConditions === "object") {
    const { createdAt: c3, updatedAt: u3, id: _m, ...cleanMan } =
      updatedDiscount.manualConditions as Record<string, unknown>
    updatedDiscount.manualConditions = {
      ...TREEZ_MANUAL_CONDITIONS_PUT_DEFAULTS,
      ...cleanMan,
    }
  }

  if (Array.isArray(updatedDiscount.collectionsRequired)) {
    updatedDiscount.collectionsRequired = updatedDiscount.collectionsRequired.map(
      (c: Record<string, unknown>) => ({
        productCollectionId: c.productCollectionId,
      }),
    )
  }

  if (Array.isArray(updatedDiscount.customerGroups)) {
    updatedDiscount.customerGroups = updatedDiscount.customerGroups.map(
      (c: Record<string, unknown>) => ({
        tagId: c.tagId,
      }),
    )
  }

  if (Array.isArray(updatedDiscount.coupons)) {
    updatedDiscount.coupons = updatedDiscount.coupons.map((c: Record<string, unknown>) => {
      const cleaned: Record<string, unknown> = {}
      if (c.code) cleaned.code = c.code
      if (c.title) cleaned.title = c.title
      if (c.startDate) cleaned.startDate = c.startDate
      if (c.endDate) cleaned.endDate = c.endDate
      if (c.startTime) cleaned.startTime = c.startTime
      if (c.endTime) cleaned.endTime = c.endTime
      return cleaned
    })
  }

  return updatedDiscount
}

/** Same contract as discount-manager-client removeNulls for API payload. */
export function sanitizeDiscountPayload(obj: unknown): unknown {
  const removeNulls = (inner: unknown): unknown => {
    if (inner === null || inner === undefined) return undefined
    if (Array.isArray(inner)) {
      const filtered = inner.map(removeNulls).filter((item) => item !== undefined)
      return filtered.length > 0 ? filtered : undefined
    }
    if (typeof inner === "object") {
      const cleaned: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(inner as Record<string, unknown>)) {
        const cleanedValue = removeNulls(value)
        if (cleanedValue !== undefined && cleanedValue !== null) {
          if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue
          if (
            typeof cleanedValue === "object" &&
            cleanedValue !== null &&
            Object.keys(cleanedValue as object).length === 0
          )
            continue
          cleaned[key] = cleanedValue as object
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined
    }
    return inner
  }
  return removeNulls(obj)
}
