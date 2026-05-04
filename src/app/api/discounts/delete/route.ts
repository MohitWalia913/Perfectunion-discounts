import { getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { discountIds } = body as { discountIds: string[] }
    
    if (!Array.isArray(discountIds) || discountIds.length === 0) {
      return NextResponse.json(
        { error: "discountIds array is required" },
        { status: 400 }
      )
    }

    const env = getTreezEnv()
    const results = []
    const errors = []

    for (const discountId of discountIds) {
      try {
        const url = `https://api-${env.env}.treez.io/service/discount/v3/${discountId}`
        
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            "X-Treez-Service-Certificate-Id": env.certId,
          },
        })

        if (res.ok || res.status === 204) {
          results.push({
            id: discountId,
            success: true,
          })
        } else {
          const errorBody = await res.text()
          errors.push({
            id: discountId,
            success: false,
            error: `HTTP ${res.status}`,
            details: errorBody,
          })
        }
      } catch (e) {
        const err = e as Error
        errors.push({
          id: discountId,
          success: false,
          error: err.message,
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
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
