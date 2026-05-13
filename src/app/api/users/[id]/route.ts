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
    email?: unknown
    full_name?: unknown
    password?: unknown
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  let nextEmail: string | undefined
  if (body.email !== undefined) {
    if (typeof body.email !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 })
    }
    const trimmed = body.email.trim()
    if (!trimmed || !emailRegex.test(trimmed)) {
      return NextResponse.json({ ok: false, error: "A valid email is required" }, { status: 400 })
    }
    nextEmail = trimmed
  }

  let nextFullName: string | null | undefined
  if (body.full_name !== undefined) {
    if (body.full_name !== null && typeof body.full_name !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid full name" }, { status: 400 })
    }
    nextFullName =
      typeof body.full_name === "string" ? body.full_name.trim() || null : null
  }

  let nextPassword: string | undefined
  if (body.password !== undefined && body.password !== null) {
    if (typeof body.password !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 400 })
    }
    const p = body.password
    if (p.length > 0 && p.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 },
      )
    }
    if (p.length > 0) nextPassword = p
  }

  const v = await normalizeAndValidateManagerStoreNames(body.assigned_store_names)
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 })
  }

  const promoParse = validateUuidList(body.shared_sales_promo_document_ids)
  if (!promoParse.ok) {
    return NextResponse.json({ ok: false, error: promoParse.error }, { status: 400 })
  }

  const authPatch: {
    email?: string
    password?: string
    user_metadata?: Record<string, unknown>
  } = {}

  if (nextEmail !== undefined && nextEmail !== (target.email ?? "")) {
    authPatch.email = nextEmail
  }
  if (nextPassword !== undefined) {
    authPatch.password = nextPassword
  }
  if (nextFullName !== undefined) {
    const { data: authRow, error: getAuthErr } = await admin.auth.admin.getUserById(targetId)
    if (getAuthErr || !authRow?.user) {
      return NextResponse.json(
        { ok: false, error: getAuthErr?.message ?? "Could not load auth user" },
        { status: 500 },
      )
    }
    const prevMeta = (authRow.user.user_metadata ?? {}) as Record<string, unknown>
    authPatch.user_metadata = {
      ...prevMeta,
      full_name: nextFullName ?? "",
    }
  }

  if (Object.keys(authPatch).length > 0) {
    const { error: authErr } = await admin.auth.admin.updateUserById(targetId, authPatch)
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 400 })
    }
  }

  const profileUpdate: Record<string, unknown> = {
    assigned_store_names: v.names,
    updated_at: new Date().toISOString(),
  }
  if (nextEmail !== undefined) {
    profileUpdate.email = nextEmail
  }
  if (nextFullName !== undefined) {
    profileUpdate.full_name = nextFullName
  }

  const { error: upErr } = await admin.from("profiles").update(profileUpdate).eq("id", targetId)

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
