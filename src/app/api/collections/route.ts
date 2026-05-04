import { fetchProductCollections, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const env = getTreezEnv()
    const result = await fetchProductCollections(env)
    return NextResponse.json(result)
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    return NextResponse.json(
      { error: err.message, details: err.body },
      { status: err.status || 500 }
    )
  }
}
