import { Liveblocks } from "@liveblocks/node"
import { NextResponse } from "next/server"
import { getSessionProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { userCanAccessSalesPromoDocument } from "@/lib/sales-promo/access"
import { parseSalesPromoRoomId } from "@/lib/sales-promo/room"

export async function POST(request: Request) {
  const profile = await getSessionProfile()
  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let body: { room?: unknown }
  try {
    body = await request.json()
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 })
  }

  const room = typeof body.room === "string" ? body.room : ""
  const documentId = parseSalesPromoRoomId(room)
  if (!documentId) {
    return new NextResponse("Invalid room", { status: 400 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch {
    return new NextResponse("Server misconfigured", { status: 500 })
  }

  const ok = await userCanAccessSalesPromoDocument(admin, profile, documentId)
  if (!ok) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret?.startsWith("sk_")) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 500 })
  }

  const liveblocks = new Liveblocks({ secret })
  const session = liveblocks.prepareSession(profile.id, {
    userInfo: {
      name: profile.full_name?.trim() || profile.email || "User",
    },
  })
  session.allow(room, session.FULL_ACCESS)
  const auth = await session.authorize()
  if (auth.error) {
    return new NextResponse(auth.error.message, { status: 500 })
  }

  return new NextResponse(auth.body, { status: auth.status })
}
