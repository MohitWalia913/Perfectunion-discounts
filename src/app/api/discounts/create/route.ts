import { createServiceDiscount, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const env = getTreezEnv()
    
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
