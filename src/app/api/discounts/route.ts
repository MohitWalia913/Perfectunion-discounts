import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import type { DiscountRow } from "@/lib/discount-fields"
import { getStoreNamesFromRow } from "@/lib/discount-format"
import { fetchServiceOrgDiscounts, getTreezEnv, normalizeDiscountRows } from "@/lib/treez"

export async function GET(req: Request) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const env = getTreezEnv()
    const { searchParams } = new URL(req.url)
    const isManual = searchParams.get("isManual")
    const body = await fetchServiceOrgDiscounts(env, {
      isManual: isManual === null ? undefined : isManual === "true",
    })
    let rows = normalizeDiscountRows(body) as DiscountRow[]
    if (actor.role === "manager") {
      const allow = new Set(actor.assigned_store_names ?? [])
      rows = rows.filter((r) => {
        const names = getStoreNamesFromRow(r)
        if (names.length === 0) return false
        return names.some((n) => allow.has(n))
      })
    }
    return NextResponse.json({ ok: true, rows, raw: body })
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        status: err.status,
        body: err.body,
      },
      { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 500 },
    )
  }
}
