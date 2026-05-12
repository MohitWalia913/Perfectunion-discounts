import { createServiceDiscount, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { rejectIfManager } from "@/lib/auth/permissions"

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: Request) {
  const denied = rejectIfManager(await getCurrentProfile())
  if (denied) return denied

  try {
    const body = await request.json()
    const env = getTreezEnv()
    
    // Check if it's a bulk upload
    if (Array.isArray(body)) {
      const results = []
      const errors = []
      
      for (let i = 0; i < body.length; i++) {
        const discount = body[i]
        try {
          const payload = {
            ...discount,
            organizationId: env.orgId,
          }
          
          const result = await createServiceDiscount(env, payload)
          results.push({
            index: i,
            success: true,
            discount: discount.title,
            data: result
          })
          
          // Add a 500ms delay between each request to avoid rate limiting
          if (i < body.length - 1) {
            await delay(500)
          }
        } catch (e) {
          const err = e as Error & { status?: number; body?: unknown }
          errors.push({
            index: i,
            success: false,
            discount: discount.title,
            error: err.message,
            details: err.body
          })
          
          // Continue with next discount even if this one failed
          if (i < body.length - 1) {
            await delay(500)
          }
        }
      }
      
      return NextResponse.json({
        total: body.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      })
    }
    
    // Single discount creation
    const payload = {
      ...body,
      organizationId: env.orgId,
    }
    
    const result = await createServiceDiscount(env, payload)
    return NextResponse.json(result)
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    return NextResponse.json(
      { error: err.message, details: err.body },
      { status: err.status || 500 }
    )
  }
}
