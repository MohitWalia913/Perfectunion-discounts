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
      color: colorForCollaborator(profile.id),
    },
  })
  session.allow(room, session.FULL_ACCESS)
  // TipTap threaded comments use the Comments API explicitly.
  session.allow(room, ["comments:read", "comments:write", "room:presence:write"])
  const auth = await session.authorize()
  if (auth.error) {
    return new NextResponse(auth.error.message, { status: 500 })
  }

  return new NextResponse(auth.body, { status: auth.status })
}

/** Stable HSL for Liveblocks avatars / cursors (aligned with starter kit style). */
function colorForCollaborator(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const hue = (h >>> 0) % 360
  return `hsl(${hue} 58% 42%)`
}
