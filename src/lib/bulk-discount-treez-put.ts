import type { BulkDiscountRow } from "@/lib/bulk-discount-io"
import { buildTreezPayloadsFromBulkRows } from "@/lib/bulk-discount-payload"
import {
  TREEZ_CONDITIONS_PUT_DEFAULTS,
  TREEZ_MANUAL_CONDITIONS_PUT_DEFAULTS,
} from "@/lib/discount-edit-helpers"

function deepCloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function stripRootMeta(o: Record<string, unknown>): void {
  delete o.createdAt
  delete o.updatedAt
}

function stripNestedMeta(rest: Record<string, unknown>): Record<string, unknown> {
  const { createdAt: _c, updatedAt: _u, id: _i, ...r } = rest
  return r
}

/** Best-effort id from Treez POST create response. */
export function extractTreezDiscountIdFromResponse(body: unknown): string {
  if (!body || typeof body !== "object") return ""
  const o = body as Record<string, unknown>
  const direct = o.id ?? o.discount_id ?? o.discountId
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  const data = o.data
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return extractTreezDiscountIdFromResponse(data[0])
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return extractTreezDiscountIdFromResponse(data)
  }
  return ""
}

/** Normalize Treez GET/POST object for storage as next PUT base. */
export function snapshotForTreezPutBase(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  try {
    return deepCloneJson(body as Record<string, unknown>)
  } catch {
    return { ...(body as Record<string, unknown>) }
  }
}

/**
 * Merge bulk grid row into Treez PUT body.
 * When `row.treezPutBase` exists (import / prior sync), merge grid schedule and catalog fields into it.
 * Otherwise send minimal POST-shaped body + `id`.
 */
export function buildTreezPutPayloadFromBulkRow(
  row: BulkDiscountRow,
  treezDiscountId: string,
): Record<string, unknown> {
  const id = treezDiscountId.trim()
  if (!id) throw new Error("Missing Treez discount id for update")

  const [postShape] = buildTreezPayloadsFromBulkRows([row])
  const baseRaw =
    row.treezPutBase && typeof row.treezPutBase === "object" && !Array.isArray(row.treezPutBase)
      ? deepCloneJson(row.treezPutBase)
      : null

  if (!baseRaw) {
    return { ...postShape, id }
  }

  stripRootMeta(baseRaw)

  const prevSchedule =
    baseRaw.schedule && typeof baseRaw.schedule === "object"
      ? stripNestedMeta({ ...(baseRaw.schedule as Record<string, unknown>) })
      : {}
  const schedFromPost =
    postShape.schedule && typeof postShape.schedule === "object"
      ? (postShape.schedule as Record<string, unknown>)
      : {}
  const scheduleOut = stripNestedMeta({
    ...prevSchedule,
    ...schedFromPost,
  })

  const prevConditions =
    baseRaw.conditions && typeof baseRaw.conditions === "object"
      ? stripNestedMeta({ ...(baseRaw.conditions as Record<string, unknown>) })
      : {}
  const postCond =
    postShape.conditions && typeof postShape.conditions === "object"
      ? stripNestedMeta({ ...(postShape.conditions as Record<string, unknown>) })
      : {}
  const conditionsOut: Record<string, unknown> = {
    ...TREEZ_CONDITIONS_PUT_DEFAULTS,
    ...prevConditions,
    ...postCond,
  }

  const out: Record<string, unknown> = {
    ...baseRaw,
    id,
    title: postShape.title,
    amount: postShape.amount,
    method: typeof baseRaw.method === "string" ? baseRaw.method : (postShape.method as string) || "PERCENT",
    storeCustomizations: postShape.storeCustomizations,
    collections: postShape.collections,
    schedule: scheduleOut,
    conditions: conditionsOut,
  }

  const post = postShape as Record<string, unknown>
  for (const k of [
    "isActive",
    "isManual",
    "isCart",
    "isStackable",
    "isAdjustment",
    "requireReason",
    "requirePin",
    "requireCoupon",
  ] as const) {
    if (k in post) out[k] = post[k]
  }

  if (out.manualConditions && typeof out.manualConditions === "object") {
    const mc = out.manualConditions as Record<string, unknown>
    out.manualConditions = {
      ...TREEZ_MANUAL_CONDITIONS_PUT_DEFAULTS,
      ...stripNestedMeta({ ...mc }),
    }
  }

  if (Array.isArray(out.collectionsRequired)) {
    out.collectionsRequired = (out.collectionsRequired as Record<string, unknown>[]).map((c) => ({
      productCollectionId: c.productCollectionId,
    }))
  }

  if (Array.isArray(out.customerGroups)) {
    out.customerGroups = (out.customerGroups as Record<string, unknown>[]).map((c) => ({
      tagId: c.tagId,
    }))
  }

  if (Array.isArray(out.coupons)) {
    out.coupons = (out.coupons as Record<string, unknown>[]).map((c) => {
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

  return out
}
