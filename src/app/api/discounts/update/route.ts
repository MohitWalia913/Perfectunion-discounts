import { getTreezEnv, updateServiceDiscount } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { discounts } = body as { discounts: any[] }
    
    if (!Array.isArray(discounts) || discounts.length === 0) {
      return NextResponse.json(
        { error: "discounts array is required" },
        { status: 400 }
      )
    }

    const env = getTreezEnv()
    const results = []
    const errors = []

    for (const discount of discounts) {
      try {
        console.log("Updating discount:", {
          id: discount.id,
          title: discount.title,
          amount: discount.amount,
        })
        console.log("Full discount payload:", JSON.stringify(discount, null, 2))
        
        const data = await updateServiceDiscount(env, discount)
        
        console.log("Update successful for discount:", discount.id)
        const responseData = Array.isArray(data) ? data[0] : data
        results.push({
          id: discount.id,
          success: true,
          data: responseData,
        })
      } catch (e) {
        const err = e as Error & { status?: number; body?: unknown }
        console.error("Update failed for discount:", discount.id, err.message, err.body)
        errors.push({
          id: discount.id,
          success: false,
          error: err.message || "Update failed",
          details: err.body,
        })
      }
    }

    return NextResponse.json({
      total: discounts.length,
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
