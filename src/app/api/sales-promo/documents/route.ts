import { NextResponse } from "next/server"
import { canManageSalesPromo } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { isSalesPromoAdminRole } from "@/lib/sales-promo/access"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type DocumentRow = {
  id: string
  title: string
  created_by: string
  created_at: string
  updated_at: string
  creator: {
    id: string
    email: string | null
    full_name: string | null
    role: string
  } | null
}

function unwrapCreator(raw: unknown): DocumentRow["creator"] {
  if (!raw || typeof raw !== "object") return null
  const c = Array.isArray(raw) ? (raw[0] as Record<string, unknown> | undefined) : (raw as Record<string, unknown>)
  if (!c || typeof c.id !== "string") return null
  return {
    id: c.id,
    email: typeof c.email === "string" ? c.email : c.email === null ? null : null,
    full_name:
      typeof c.full_name === "string" ? c.full_name : c.full_name === null ? null : null,
    role: typeof c.role === "string" ? c.role : String(c.role ?? ""),
  }
}

function mapDocumentRows(rows: unknown): DocumentRow[] {
  if (!Array.isArray(rows)) return []
  const out: DocumentRow[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const id = r.id
    const title = r.title
    const created_by = r.created_by
    const created_at = r.created_at
    const updated_at = r.updated_at
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof created_by !== "string" ||
      typeof created_at !== "string" ||
      typeof updated_at !== "string"
    ) {
      continue
    }
    out.push({
      id,
      title,
      created_by,
      created_at,
      updated_at,
      creator: unwrapCreator(r.creator),
    })
  }
  return out
}

export async function GET() {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  if (isSalesPromoAdminRole(actor.role)) {
    const { data, error } = await admin
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
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      documents: mapDocumentRows(data ?? []),
      canManage: true,
    })
  }

  const { data: shareRows, error: shareErr } = await admin
    .from("sales_promo_document_shares")
    .select("document_id")
    .eq("user_id", actor.id)

  if (shareErr) {
    return NextResponse.json({ ok: false, error: shareErr.message }, { status: 500 })
  }

  const ids = Array.from(new Set((shareRows ?? []).map((r) => r.document_id as string)))
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, documents: [] as DocumentRow[], canManage: false })
  }

  const { data, error } = await admin
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
    .in("id", ids)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    documents: mapDocumentRows(data ?? []),
    canManage: false,
  })
}

export async function POST(request: Request) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageSalesPromo(actor)) {
    return NextResponse.json(
      { ok: false, error: "Only admins can create promo documents" },
      { status: 403 },
    )
  }

  let body: { title?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const rawTitle = typeof body.title === "string" ? body.title.trim() : ""
  const title = rawTitle.length > 0 ? rawTitle.slice(0, 200) : "Untitled promo"

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const { data: row, error } = await admin
    .from("sales_promo_documents")
    .insert({
      title,
      created_by: actor.id,
    })
    .select("id,title,created_by,created_at,updated_at")
    .single()

  if (error || !row) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Insert failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, document: row })
}
