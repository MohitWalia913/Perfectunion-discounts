/** Shared helpers for dispensary + org discount row shapes (client-safe). */

export type DiscountRow = Record<string, unknown>

export function getDiscountRowId(row: DiscountRow): string {
  const id = row.id ?? row.discount_id ?? row.discountId ?? row._id ?? row.uuid
  return id !== undefined && id !== null ? String(id) : ""
}

export function getDiscountTitle(row: DiscountRow): string {
  const t =
    row.title ??
    row.discount_title ??
    row.displayTitle ??
    row.discount_display_title ??
    ""
  const s = String(t).trim()
  return s || "Untitled discount"
}

export function getDiscountMethod(row: DiscountRow): string {
  return String(row.method ?? row.discount_method ?? "")
    .trim()
    .toUpperCase()
}

export function getDiscountAmount(row: DiscountRow): string {
  const a = row.amount ?? row.discount_amount
  if (a === undefined || a === null) return "—"
  
  // Parse as number and format to remove trailing zeros
  const num = parseFloat(String(a))
  if (isNaN(num)) return String(a)
  
  // Format intelligently: show decimals only if needed
  // For whole numbers like 44.0000, show as "44"
  // For numbers with decimals like 44.5, show as "44.5"
  // Limit to max 2 decimal places for cleaner display
  if (num % 1 === 0) {
    return String(Math.round(num))
  }
  
  // Has decimal places - show up to 2 significant decimals
  const rounded = Math.round(num * 100) / 100
  return String(rounded)
}

export function getDiscountActive(row: DiscountRow): boolean | null {
  if (typeof row.isActive === "boolean") return row.isActive
  if (typeof row.discount_active === "boolean") return row.discount_active
  return null
}

export function getDiscountCart(row: DiscountRow): boolean | null {
  if (typeof row.isCart === "boolean") return row.isCart
  const aff = String(row.discount_affinity ?? "")
    .trim()
    .toLowerCase()
  if (aff === "cart") return true
  if (aff === "pre-cart" || aff === "pre cart") return false
  return null
}

const KNOWN_METHODS = new Set([
  "PERCENT",
  "DOLLAR",
  "COST",
  "BOGO",
  "BUNDLE",
  "PRICE_AT",
])

export function normalizeMethodTab(method: string): string {
  const m = method.trim().toUpperCase()
  if (!m) return "OTHER"
  if (KNOWN_METHODS.has(m)) return m
  return "OTHER"
}

export function getDiscountSchedule(row: DiscountRow): string {
  const schedule = row.schedule
  
  if (!schedule || typeof schedule !== 'object') {
    return "Always active"
  }
  
  const scheduleObj = schedule as Record<string, unknown>
  
  // Check for start date
  const start = scheduleObj.start ?? scheduleObj.startDate ?? scheduleObj.start_date
  const startStr = start ? String(start).split('T')[0] : null
  
  // Check for repeat pattern
  const repeat = scheduleObj.repeat ?? scheduleObj.frequency ?? scheduleObj.recurrence
  const repeatStr = repeat ? String(repeat).toUpperCase() : null
  
  // Check for all day
  const allDay = scheduleObj.allDay ?? scheduleObj.all_day ?? scheduleObj.isAllDay
  const isAllDay = allDay === true || allDay === 'true'
  
  // Check for days of week
  const daysOfWeek = scheduleObj.daysOfWeek ?? scheduleObj.days ?? scheduleObj.weekdays
  const hasDays = Array.isArray(daysOfWeek) && daysOfWeek.length > 0
  
  // Check for end date
  const end = scheduleObj.end ?? scheduleObj.endDate ?? scheduleObj.end_date
  const endStr = end ? String(end).split('T')[0] : null
  
  // Build schedule string
  const parts: string[] = []
  
  if (startStr) {
    parts.push(`Start ${startStr}`)
  }
  
  if (repeatStr && repeatStr !== 'NONE') {
    parts.push(`Repeat: ${repeatStr}`)
  }
  
  if (isAllDay) {
    parts.push("All day")
  }
  
  if (endStr) {
    parts.push(`Until ${endStr}`)
  }
  
  return parts.length > 0 ? parts.join(' • ') : "Always active"
}

/** Date portion YYYY-MM-DD from schedule, or null */
export function getScheduleStartDateISO(row: DiscountRow): string | null {
  const schedule = row.schedule
  if (!schedule || typeof schedule !== "object") return null
  const o = schedule as Record<string, unknown>
  const keys = ["startDate", "start", "start_date"] as const
  for (const k of keys) {
    const v = o[k]
    if (v == null || v === "") continue
    const part = String(v).split("T")[0] ?? ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part
  }
  return null
}

export function getScheduleEndDateISO(row: DiscountRow): string | null {
  const schedule = row.schedule
  if (!schedule || typeof schedule !== "object") return null
  const o = schedule as Record<string, unknown>
  const keys = ["endDate", "end", "end_date"] as const
  for (const k of keys) {
    const v = o[k]
    if (v == null || v === "") continue
    const part = String(v).split("T")[0] ?? ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part
  }
  return null
}

/** Treez `schedule.repeatType`: DO_NOT, DAY, WEEK, MONTH, etc. */
export function getScheduleRepeatType(
  row: DiscountRow,
): "DO_NOT" | "DAY" | "WEEK" | "MONTH" | string | null {
  const schedule = row.schedule
  if (!schedule || typeof schedule !== "object") return null
  const raw = (schedule as Record<string, unknown>).repeatType
  if (typeof raw !== "string" || !raw.trim()) return null
  return raw.trim().toUpperCase()
}

const DETAIL_KEYS = [
  "organizationId",
  "storeCustomizations",
  "collections",
  "collectionsRequired",
  "customerGroups",
  "coupons",
  "conditions",
  "manualConditions",
  "schedule",
  "imageUrl",
  "displayImageOnly",
  "isStackable",
  "isSuperStackable",
  "isAdjustment",
  "isManual",
  "requireCoupon",
  "requirePin",
  "requireReason",
  "qualifyingBalance",
  "createdAt",
  "updatedAt",
] as const

export function buildDiscountDetailPreview(row: DiscountRow): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of DETAIL_KEYS) {
    if (row[k] !== undefined) out[k] = row[k]
  }
  return out
}
