import { fetchDispensaryProducts, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const env = getTreezEnv()
    const { searchParams } = new URL(req.url)
    const dispensary = searchParams.get("dispensary")
    
    const result = await fetchDispensaryProducts(env, dispensary || undefined)
    return NextResponse.json(result)
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    return NextResponse.json(
      { error: err.message, details: err.body },
      { status: err.status || 500 }
    )
  }
}
