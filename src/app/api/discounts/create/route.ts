import { createServiceDiscount, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { rejectIfManager } from "@/lib/auth/permissions"

export async function POST(request: Request) {
  const denied = rejectIfManager(await getCurrentProfile())
  if (denied) return denied

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
