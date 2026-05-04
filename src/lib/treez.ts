import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

function base64UrlEncode(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

export type TreezEnv = {
  privateKeyPem: string
  certId: string
  orgId: string
  /** Optional — only used for dispensary-scoped endpoints. */
  dispensary?: string
  apiBase?: string
}

export function getTreezEnv(): TreezEnv {
  const fromFile = process.env.TREEZ_PRIVATE_KEY_FILE?.trim()
  let privateKeyPem: string | undefined
  if (fromFile) {
    const keyPath = path.isAbsolute(fromFile)
      ? fromFile
      : path.join(/* turbopackIgnore: true */ process.cwd(), fromFile)
    privateKeyPem = fs.readFileSync(keyPath, "utf8").trim()
  } else {
    privateKeyPem = process.env.TREEZ_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim()
  }
  const certId = process.env.TREEZ_CERT_ID
  const orgId = process.env.TREEZ_ORG_ID
  const dispensary = process.env.TREEZ_DISPENSARY?.trim()
  if (!privateKeyPem?.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "Treez private key missing or invalid PEM. Set TREEZ_PRIVATE_KEY or TREEZ_PRIVATE_KEY_FILE.",
    )
  }
  if (!certId || !orgId) {
    throw new Error("TREEZ_CERT_ID and TREEZ_ORG_ID are required")
  }
  return {
    privateKeyPem,
    certId,
    orgId,
    dispensary: dispensary || undefined,
    apiBase: process.env.TREEZ_API_BASE ?? "https://api-prod.treez.io",
  }
}

/** `aud` must match the exact URL of the request (Treez JWT rules). */
export function buildTreezAuthorizationHeader(audUrl: string, env: TreezEnv): string {
  const now = Date.now()
  const header = {
    aud: audUrl,
    iss: env.certId,
    oid: env.orgId,
    iat: now,
    exp: now + 30_000,
    jti: crypto.randomUUID(),
  }
  const strHeader = base64UrlEncode(header)
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(strHeader)
  signer.end()
  const signature = signer.sign(env.privateKeyPem, "base64url")
  return `${strHeader}.${signature}`
}

/** Org-level: `GET /service/discount/v3/discount` (optional `isManual` query). */
export function serviceDiscountUrl(env: TreezEnv, searchParams?: URLSearchParams): string {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const pathPart = `/service/discount/v3/discount`
  const qs = searchParams?.toString()
  return qs ? `${base}${pathPart}?${qs}` : `${base}${pathPart}`
}

export async function fetchServiceOrgDiscounts(
  env: TreezEnv,
  opts?: { isManual?: boolean },
): Promise<unknown> {
  const params = new URLSearchParams()
  if (opts?.isManual !== undefined) params.set("isManual", String(opts.isManual))
  const url = serviceDiscountUrl(env, params.size ? params : undefined)
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export function discountsRequestUrl(env: TreezEnv, searchParams?: URLSearchParams): string {
  const disp = env.dispensary
  if (!disp) {
    throw new Error("TREEZ_DISPENSARY is required for dispensary discount endpoints")
  }
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const pathPart = `/dispensary/v3/${encodeURIComponent(disp)}/discount/all`
  const qs = searchParams?.toString()
  return qs ? `${base}${pathPart}?${qs}` : `${base}${pathPart}`
}

export async function fetchDispensaryDiscounts(
  env: TreezEnv,
  filters?: { active?: boolean; discount_type?: string; cart_affinity?: string; page?: number },
): Promise<unknown> {
  const params = new URLSearchParams()
  if (filters?.active !== undefined) params.set("active", String(filters.active))
  if (filters?.discount_type) params.set("discount_type", filters.discount_type)
  if (filters?.cart_affinity) params.set("cart_affinity", filters.cart_affinity)
  if (filters?.page !== undefined && filters.page >= 1) params.set("page", String(filters.page))

  const url = discountsRequestUrl(env, params.size ? params : undefined)
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export function normalizeDiscountRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (!payload || typeof payload !== "object") return []

  const o = payload as Record<string, unknown>

  /** Service may return `{ data: [...] }` or plain envelope. */
  if (Array.isArray(o.data)) {
    return o.data as Record<string, unknown>[]
  }

  /** Dispensary: `{ resultCode, data: { discounts: [...] } }` */
  const data = o.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const inner = data as Record<string, unknown>
    if (Array.isArray(inner.discounts)) {
      return inner.discounts as Record<string, unknown>[]
    }
  }

  const candidates = ["data", "result", "discounts", "items", "records"] as const
  for (const k of candidates) {
    const v = o[k]
    if (Array.isArray(v)) return v as Record<string, unknown>[]
  }
  return []
}

/** Pagination info from Treez dispensary `data` wrapper. */
export function discountListMeta(payload: unknown): {
  totalElements: number
  pageElements: number
} | null {
  if (!payload || typeof payload !== "object") return null
  const data = (payload as Record<string, unknown>).data
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const d = data as Record<string, unknown>
  const total = d.total_elements
  const page = d.page_elements
  if (typeof total !== "number" || typeof page !== "number") return null
  return { totalElements: total, pageElements: page }
}

const PREFERRED_KEYS = [
  "discount_id",
  "discount_title",
  "discount_display_title",
  "discount_method",
  "discount_amount",
  "discount_active",
  "discount_affinity",
  "discount_stackable",
  "discount_description",
  "id",
  "title",
  "displayTitle",
  "method",
  "amount",
  "name",
  "discount_name",
  "description",
  "discount_type",
  "type",
  "active",
  "isActive",
  "enabled",
  "percent",
  "value",
  "cart_affinity",
  "start_date",
  "end_date",
  "created_at",
  "updated_at",
]

export function pickTableColumns(rows: Record<string, unknown>[]): string[] {
  if (!rows.length) return []
  const keys = new Set<string>()
  for (const row of rows) {
    for (const k of Object.keys(row)) keys.add(k)
  }
  const ordered: string[] = []
  for (const k of PREFERRED_KEYS) {
    if (keys.has(k)) ordered.push(k)
  }
  for (const k of [...keys].sort()) {
    if (!ordered.includes(k)) ordered.push(k)
  }
  return ordered.slice(0, 12)
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export async function createServiceDiscount(
  env: TreezEnv,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/discount/v3/discount`
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, br",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export async function updateServiceDiscount(
  env: TreezEnv,
  payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/discount/v3/discount`
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, br",
    },
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export async function deleteServiceDiscount(
  env: TreezEnv,
  discountId: string,
): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/discount/v3/${encodeURIComponent(discountId)}`
  
  console.log("deleteServiceDiscount - URL:", url)
  console.log("deleteServiceDiscount - Discount ID:", discountId)
  
  const auth = buildTreezAuthorizationHeader(url, env)
  
  console.log("deleteServiceDiscount - Auth header length:", auth.length)
  console.log("deleteServiceDiscount - Auth header preview:", auth.substring(0, 50) + "...")

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    console.error("deleteServiceDiscount - Failed:", {
      status: res.status,
      url,
      discountId,
      body
    })
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  console.log("deleteServiceDiscount - Success:", body)
  return body
}

export async function deactivateServiceDiscount(
  env: TreezEnv,
  discountId: string,
): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/discount/v3/${encodeURIComponent(discountId)}`
  
  console.log("deactivateServiceDiscount - URL:", url)
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, br",
    },
    body: JSON.stringify({ isActive: false }),
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    console.error("deactivateServiceDiscount - Failed:", {
      status: res.status,
      body
    })
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  console.log("deactivateServiceDiscount - Success:", body)
  return body
}

export async function fetchProductCollections(env: TreezEnv): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/collection/v3`
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export async function fetchOrgStores(env: TreezEnv): Promise<unknown> {
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/service/catalog/v3/organization-entity`
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export async function fetchDispensaryProducts(
  env: TreezEnv,
  dispensaryName?: string,
): Promise<unknown> {
  const disp = dispensaryName || env.dispensary
  if (!disp) {
    throw new Error("Dispensary name is required for product list endpoint")
  }
  const base = (env.apiBase ?? "https://api-prod.treez.io").replace(/\/$/, "")
  const url = `${base}/dispensary/v3/${encodeURIComponent(disp)}/product/product_list`
  const auth = buildTreezAuthorizationHeader(url, env)

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`Treez API ${res.status}`) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}
