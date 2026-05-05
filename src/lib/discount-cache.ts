/** Browser cache for org discounts list (dashboard). TTL default 24 hours. */

export const DISCOUNT_CACHE_KEY = "pu-org-discounts-cache-v1"
export const DISCOUNT_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type DiscountCachePayload = {
  rows: Record<string, unknown>[]
  fetchedAt: number
}

export function readDiscountCache(): DiscountCachePayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DISCOUNT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DiscountCachePayload
    if (!Array.isArray(parsed.rows) || typeof parsed.fetchedAt !== "number") return null
    return parsed
  } catch {
    return null
  }
}

export function writeDiscountCache(rows: Record<string, unknown>[]): void {
  if (typeof window === "undefined") return
  try {
    const payload: DiscountCachePayload = { rows, fetchedAt: Date.now() }
    localStorage.setItem(DISCOUNT_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}

export function isDiscountCacheStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt >= DISCOUNT_CACHE_TTL_MS
}
