import { NextResponse } from "next/server"
import {
  canConfigureManagerAccess,
  canDeleteUser,
} from "@/lib/auth/permissions"
import { getCurrentProfile, getProfileForUser, normalizeProfileRow } from "@/lib/auth/profile"
import { syncManagerPromoShares } from "@/lib/manager-promo-shares"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { validateUuidList } from "@/lib/validate-promo-doc-ids"
import { normalizeAndValidateManagerStoreNames } from "@/lib/validate-manager-stores"

export async function PATCH(
  request: Request,
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

  let body: {
    assigned_store_names?: unknown
    shared_sales_promo_document_ids?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const target = await getProfileForUser(targetId, admin)

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 })
  }

  if (!canConfigureManagerAccess(actor, target)) {
    return NextResponse.json(
      { ok: false, error: "You cannot update this user’s assignments" },
      { status: 403 },
    )
  }

  const v = await normalizeAndValidateManagerStoreNames(body.assigned_store_names)
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 })
  }

  const promoParse = validateUuidList(body.shared_sales_promo_document_ids)
  if (!promoParse.ok) {
    return NextResponse.json({ ok: false, error: promoParse.error }, { status: 400 })
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      assigned_store_names: v.names,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId)

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
  }

  try {
    await syncManagerPromoShares(admin, targetId, promoParse.ids)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not update promo shares" },
      { status: 500 },
    )
  }

  const { data: fresh } = await admin
    .from("profiles")
    .select("id,email,full_name,role,created_at,assigned_store_names")
    .eq("id", targetId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    user: fresh ? normalizeProfileRow(fresh as Record<string, unknown>) : target,
  })
}

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

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

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
