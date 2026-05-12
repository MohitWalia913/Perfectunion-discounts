import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"

/** Session profile for dashboard clients (includes manager store assignments). */
export async function GET() {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized", profile: null }, { status: 401 })
  }

  return NextResponse.json({ ok: true, profile: actor })
}
