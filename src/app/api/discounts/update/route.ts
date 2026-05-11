import { getTreezEnv, formatTreezApiError, updateServiceDiscount } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { discounts?: unknown }
    const discountsRaw = body.discounts

    if (!Array.isArray(discountsRaw) || discountsRaw.length === 0) {
      return NextResponse.json(
        { error: "discounts array is required" },
        { status: 400 }
      )
    }

    const env = getTreezEnv()
    const results = []
    const errors = []

    for (const discount of discountsRaw) {
      if (!discount || typeof discount !== "object") {
        errors.push({
          id: "(invalid)",
          success: false,
          error: "Each discount must be an object",
        })
        continue
      }
      const d = discount as Record<string, unknown>
      if (!d.id) {
        errors.push({
          id: "(missing)",
          success: false,
          error: "Each discount payload must include `id` (Treez PUT /v3/discount updates by id)",
        })
        continue
      }
      try {
        console.log("Updating discount:", {
          id: d.id,
          title: d.title,
          amount: d.amount,
        })
        console.log("Full discount payload:", JSON.stringify(d, null, 2))

        const data = await updateServiceDiscount(env, d)

        console.log("Update successful for discount:", d.id)
        const responseData = Array.isArray(data) ? data[0] : data
        results.push({
          id: d.id,
          success: true,
          data: responseData,
        })
      } catch (e) {
        const err = e as Error & { status?: number; body?: unknown }
        console.error("Update failed for discount:", d.id, err.message, err.body)
        errors.push({
          id: d.id,
          success: false,
          error: formatTreezApiError(e),
          details: err.body,
          httpStatus: err.status,
        })
      }
    }

    return NextResponse.json({
      total: discountsRaw.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (e) {
    const err = e as Error
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
