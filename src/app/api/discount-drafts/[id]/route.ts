import { NextResponse } from "next/server"
import { rejectIfManager } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

async function assertOwnDraft(
  admin: ReturnType<typeof createServiceRoleClient>,
  draftId: string,
  userId: string,
) {
  const { data, error } = await admin
    .from("bulk_discount_drafts")
    .select("id,created_by,title,rows,created_at,updated_at")
    .eq("id", draftId)
    .maybeSingle()

  if (error) return { ok: false as const, response: NextResponse.json({ error: error.message }, { status: 500 }) }
  if (!data || data.created_by !== userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { ok: true as const, draft: data }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentProfile()
  const denied = rejectIfManager(actor)
  if (denied) return denied
  const uid = actor!.id

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase admin not configured" },
      { status: 500 },
    )
  }

  const { id } = await params
  const check = await assertOwnDraft(admin, id, uid)
  if (!check.ok) return check.response

  return NextResponse.json({ draft: check.draft })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentProfile()
  const denied = rejectIfManager(actor)
  if (denied) return denied
  const uid = actor!.id

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase admin not configured" },
      { status: 500 },
    )
  }

  const { id } = await params
  const check = await assertOwnDraft(admin, id, uid)
  if (!check.ok) return check.response

  let body: { title?: unknown; rows?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === "string") {
    patch.title = body.title.trim().slice(0, 200) || "Untitled draft"
  }
  if (Array.isArray(body.rows)) {
    patch.rows = body.rows
  }

  const { data, error } = await admin
    .from("bulk_discount_drafts")
    .update(patch)
    .eq("id", id)
    .select("id,title,rows,created_at,updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 })
  }

  return NextResponse.json({ draft: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentProfile()
  const denied = rejectIfManager(actor)
  if (denied) return denied
  const uid = actor!.id

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase admin not configured" },
      { status: 500 },
    )
  }

  const { id } = await params
  const check = await assertOwnDraft(admin, id, uid)
  if (!check.ok) return check.response

  const { error } = await admin.from("bulk_discount_drafts").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
