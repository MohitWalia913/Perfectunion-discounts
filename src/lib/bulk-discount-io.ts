/** Serialize / restore bulk discount grid rows for Supabase `jsonb` storage. */

import { format } from "date-fns"

export interface StoreEntity {
  id: string
  name: string
}

export interface ProductCollection {
  id: string
  name: string
}

export type BulkDiscountType = "FUN_FRIDAY" | "HOTBOX" | "DAILY_SPECIAL" | "CUSTOM"

export interface BulkDiscountRow {
  id: string
  discountType: BulkDiscountType
  title: string
  customTitle: string
  amount: string
  selectedStores: StoreEntity[]
  startDate: Date | undefined
  endDate: Date | undefined
  repeat: boolean
  repeatType: "DAY" | "WEEK" | "MONTH" | "DO_NOT"
  selectedCollections: ProductCollection[]
  isValid: boolean
  validationError?: string
  /** YYYY-MM-DD — auto-publish this row on that day (cron). */
  scheduledPublishDate?: string | null
  publishedAt?: string | null
  publishError?: string | null
  /** Treez discount id when row was imported from live data or after a successful create. */
  treezDiscountId?: string | null
  /** Snapshot of Treez GET row for PUT merges (import / post-create). */
  treezPutBase?: Record<string, unknown> | null
}

export type BulkDiscountRowStored = Omit<BulkDiscountRow, "startDate" | "endDate"> & {
  startDate: string | null
  endDate: string | null
}

export function serializeBulkRows(rows: BulkDiscountRow[]): BulkDiscountRowStored[] {
  return rows.map((row) => ({
    ...row,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
  }))
}

export function parseIsoDate(s: string | null | undefined): Date | undefined {
  if (!s || typeof s !== "string") return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function defaultEmptyRow(): BulkDiscountRow {
  return {
    id: crypto.randomUUID(),
    discountType: "FUN_FRIDAY",
    title: "",
    customTitle: "",
    amount: "",
    selectedStores: [],
    startDate: undefined,
    endDate: undefined,
    repeat: false,
    repeatType: "DO_NOT",
    selectedCollections: [],
    isValid: false,
    treezDiscountId: null,
    treezPutBase: null,
  }
}

export function generateBulkTitle(row: BulkDiscountRow): string {
  if (row.discountType === "CUSTOM") {
    return row.customTitle
  }

  const dateMonth = row.startDate ? format(row.startDate, "d MMM").toUpperCase() : "DATE"
  const percentage = row.amount || "X"
  const firstCollection = row.selectedCollections[0]?.name || "COLLECTION"

  switch (row.discountType) {
    case "FUN_FRIDAY":
      return `FUN FRIDAY ON ${dateMonth} - ${percentage}% OFF`
    case "HOTBOX": {
      const startDateMonth = row.startDate
        ? format(row.startDate, "d MMM").toUpperCase()
        : "DATE"
      const endDateMonth = row.endDate
        ? format(row.endDate, "d MMM").toUpperCase()
        : row.startDate
          ? format(row.startDate, "d MMM").toUpperCase()
          : "DATE"
      return `HOTBOX ON ${startDateMonth} TO ${endDateMonth} END - ${percentage}% OFF`
    }
    case "DAILY_SPECIAL": {
      const base = `${firstCollection} - ${percentage}% OFF`
      if (!row.startDate) return base
      const dow = format(row.startDate, "EEE").toUpperCase()
      return `${base} [${dow}]`
    }
    default:
      return ""
  }
}

export function validateBulkRow(row: BulkDiscountRow): { isValid: boolean; error?: string } {
  const generatedTitle = generateBulkTitle(row)
  if (!generatedTitle.trim()) {
    return { isValid: false, error: "Title cannot be generated - missing required fields" }
  }
  if (!row.amount.trim() || isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0) {
    return { isValid: false, error: "Valid discount amount is required" }
  }
  if (row.selectedStores.length === 0) {
    return { isValid: false, error: "At least one store is required" }
  }
  if (!row.startDate) {
    return { isValid: false, error: "Start date is required" }
  }
  if (row.selectedCollections.length === 0) {
    return { isValid: false, error: "At least one collection is required" }
  }
  return { isValid: true }
}

export function recomputeRowMeta(row: BulkDiscountRow): BulkDiscountRow {
  const title = generateBulkTitle(row)
  const validation = validateBulkRow({ ...row, title })
  return {
    ...row,
    title,
    isValid: validation.isValid,
    validationError: validation.error,
  }
}

/** Every row has a non-empty `publishedAt` — safe to remove the draft from storage. */
export function isBulkDraftFullyPublished(rows: BulkDiscountRow[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((r) => typeof r.publishedAt === "string" && r.publishedAt.trim().length > 0)
  )
}

export function deserializeBulkRows(raw: unknown): BulkDiscountRow[] {
  if (!Array.isArray(raw)) return [defaultEmptyRow()]
  const out: BulkDiscountRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    const id = typeof r.id === "string" ? r.id : crypto.randomUUID()
    const discountType =
      r.discountType === "FUN_FRIDAY" ||
      r.discountType === "HOTBOX" ||
      r.discountType === "DAILY_SPECIAL" ||
      r.discountType === "CUSTOM"
        ? r.discountType
        : "FUN_FRIDAY"
    const repeatType =
      r.repeatType === "DAY" ||
      r.repeatType === "WEEK" ||
      r.repeatType === "MONTH" ||
      r.repeatType === "DO_NOT"
        ? r.repeatType
        : "DO_NOT"
    const stores: StoreEntity[] = Array.isArray(r.selectedStores)
      ? (r.selectedStores as unknown[]).map((s) => {
          if (!s || typeof s !== "object") return { id: "", name: "" }
          const o = s as Record<string, unknown>
          return {
            id: String(o.id ?? ""),
            name: String(o.name ?? ""),
          }
        })
      : []
    const cols: ProductCollection[] = Array.isArray(r.selectedCollections)
      ? (r.selectedCollections as unknown[]).map((c) => {
          if (!c || typeof c !== "object") return { id: "", name: "" }
          const o = c as Record<string, unknown>
          return { id: String(o.id ?? ""), name: String(o.name ?? "") }
        })
      : []
    const base: BulkDiscountRow = {
      id,
      discountType,
      title: typeof r.title === "string" ? r.title : "",
      customTitle: typeof r.customTitle === "string" ? r.customTitle : "",
      amount: typeof r.amount === "string" ? r.amount : "",
      selectedStores: stores.filter((s) => s.id && s.name),
      startDate: parseIsoDate(r.startDate as string | null),
      endDate: parseIsoDate(r.endDate as string | null),
      repeat: r.repeat === true,
      repeatType,
      selectedCollections: cols.filter((c) => c.id && c.name),
      isValid: false,
      validationError: typeof r.validationError === "string" ? r.validationError : undefined,
      scheduledPublishDate:
        typeof r.scheduledPublishDate === "string" ? r.scheduledPublishDate : null,
      publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : null,
      publishError: typeof r.publishError === "string" ? r.publishError : null,
      treezDiscountId:
        typeof r.treezDiscountId === "string" && r.treezDiscountId.trim()
          ? r.treezDiscountId.trim()
          : null,
      treezPutBase:
        r.treezPutBase &&
        typeof r.treezPutBase === "object" &&
        !Array.isArray(r.treezPutBase)
          ? (JSON.parse(JSON.stringify(r.treezPutBase)) as Record<string, unknown>)
          : null,
    }
    out.push(recomputeRowMeta(base))
  }
  return out.length > 0 ? out : [defaultEmptyRow()]
}
