import { NextResponse } from "next/server"
import { canDeleteUser } from "@/lib/auth/permissions"
import { getCurrentProfile, getProfileForUser } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: targetId } = await ctx.params
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const target = await getProfileForUser(targetId, admin)

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 })
  }

  if (!canDeleteUser(actor, target)) {
    return NextResponse.json(
      { ok: false, error: "You cannot remove this user" },
      { status: 403 },
    )
  }

  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
