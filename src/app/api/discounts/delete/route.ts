import { deleteServiceDiscountOrFallback, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { rejectIfManager } from "@/lib/auth/permissions"

export async function POST(request: Request) {
  const denied = rejectIfManager(await getCurrentProfile())
  if (denied) return denied

  try {
    const body = await request.json()
    const { discountIds } = body as { discountIds: string[] }

    if (!Array.isArray(discountIds) || discountIds.length === 0) {
      return NextResponse.json(
        { error: "discountIds array is required" },
        { status: 400 },
      )
    }

    const env = getTreezEnv()
    const results: Array<Record<string, unknown>> = []
    const errors: Array<Record<string, unknown>> = []

    for (const discountId of discountIds) {
      const id =
        typeof discountId === "string" ? discountId.trim() : String(discountId ?? "").trim()

      if (!id || id === "undefined" || id === "null") {
        errors.push({
          id: discountId,
          success: false,
          error: "Invalid discount ID",
        })
        continue
      }

      try {
        const outcome = await deleteServiceDiscountOrFallback(env, id)
        results.push({
          id,
          success: true,
          ...(outcome.outcome === "deactivated"
            ? {
                deactivated: true as const,
                data: outcome.body,
                _note:
                  "Discount was deactivated (not deleted) due to API limitations — same fallback as single delete.",
              }
            : { data: outcome.body }),
        })
      } catch (e) {
        const err = e as Error & { status?: number; body?: unknown }
        errors.push({
          id,
          success: false,
          error: err.message || "Delete failed",
          details: err.body,
          status: err.status,
        })
      }
    }

    return NextResponse.json({
      total: discountIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
