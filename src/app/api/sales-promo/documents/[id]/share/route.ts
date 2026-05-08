import { NextResponse } from "next/server"
import { canManageSalesPromo } from "@/lib/auth/permissions"
import { getCurrentProfile, getProfileForUser } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: RouteCtx) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageSalesPromo(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { id: documentId } = await ctx.params
  if (!documentId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  }

  let body: { user_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const targetId = typeof body.user_id === "string" ? body.user_id.trim() : ""
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "user_id is required" }, { status: 400 })
  }
  if (targetId === actor.id) {
    return NextResponse.json({ ok: false, error: "Cannot share with yourself here" }, { status: 400 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const { data: doc, error: docErr } = await admin
    .from("sales_promo_documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle()

  if (docErr) {
    return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 })
  }
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 })
  }

  const target = await getProfileForUser(targetId, admin)
  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 })
  }

  const { error } = await admin.from("sales_promo_document_shares").upsert(
    {
      document_id: documentId,
      user_id: targetId,
    },
    { onConflict: "document_id,user_id" },
  )

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    share: { user_id: targetId, profile: target },
  })
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageSalesPromo(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { id: documentId } = await ctx.params
  const { searchParams } = new URL(request.url)
  const targetId = searchParams.get("user_id")?.trim() ?? ""

  if (!documentId || !targetId) {
    return NextResponse.json(
      { ok: false, error: "document id and user_id query required" },
      { status: 400 },
    )
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const { error } = await admin
    .from("sales_promo_document_shares")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", targetId)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
