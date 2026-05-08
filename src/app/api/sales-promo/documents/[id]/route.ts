import { NextResponse } from "next/server"
import { canManageSalesPromo } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { userCanAccessSalesPromoDocument } from "@/lib/sales-promo/access"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: RouteCtx) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: documentId } = await ctx.params
  if (!documentId) {
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

  const ok = await userCanAccessSalesPromoDocument(admin, actor, documentId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { data: doc, error: docErr } = await admin
    .from("sales_promo_documents")
    .select(
      `
      id,
      title,
      created_by,
      created_at,
      updated_at,
      creator:profiles!sales_promo_documents_created_by_fkey (
        id,
        email,
        full_name,
        role
      )
    `,
    )
    .eq("id", documentId)
    .maybeSingle()

  if (docErr) {
    return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 })
  }
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }

  let shares: {
    user_id: string
    created_at: string
    profile: {
      id: string
      email: string | null
      full_name: string | null
      role: string
    } | null
  }[] = []

  if (canManageSalesPromo(actor)) {
    const { data: shareRows, error: shareErr } = await admin
      .from("sales_promo_document_shares")
      .select("user_id, created_at")
      .eq("document_id", documentId)

    if (!shareErr && shareRows?.length) {
      const userIds = shareRows.map((s) => s.user_id as string)
      const { data: profs } = await admin
        .from("profiles")
        .select("id,email,full_name,role")
        .in("id", userIds)
      const map = new Map((profs ?? []).map((p) => [p.id as string, p]))
      shares = shareRows.map((s) => {
        const uid = s.user_id as string
        return {
          user_id: uid,
          created_at: s.created_at as string,
          profile: (map.get(uid) as (typeof shares)[number]["profile"]) ?? null,
        }
      })
    }
  }

  return NextResponse.json({
    ok: true,
    document: doc,
    shares,
    canManage: canManageSalesPromo(actor),
  })
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: documentId } = await ctx.params
  if (!documentId) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  }

  let body: { title?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const raw = typeof body.title === "string" ? body.title.trim() : ""
  if (!raw) {
    return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 })
  }
  const title = raw.slice(0, 200)

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const ok = await userCanAccessSalesPromoDocument(admin, actor, documentId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await admin
    .from("sales_promo_documents")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .select("id,title,created_by,created_at,updated_at")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, document: data })
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
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

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const { error } = await admin.from("sales_promo_documents").delete().eq("id", documentId)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
