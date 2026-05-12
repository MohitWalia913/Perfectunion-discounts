import { NextResponse } from "next/server"
import { rejectIfManager } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET() {
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

  const { data, error } = await admin
    .from("bulk_discount_drafts")
    .select("id,title,rows,created_at,updated_at")
    .eq("created_by", uid)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const drafts = (data ?? []).map((d) => ({
    ...d,
    rowCount: Array.isArray(d.rows) ? d.rows.length : 0,
  }))

  return NextResponse.json({ drafts })
}

export async function POST(request: Request) {
  const actor = await getCurrentProfile()
  const denied = rejectIfManager(actor)
  if (denied) return denied
  const uid = actor!.id

  let body: { title?: unknown; rows?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Untitled draft"
  const rows = Array.isArray(body.rows) ? body.rows : []

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase admin not configured" },
      { status: 500 },
    )
  }

  const { data, error } = await admin
    .from("bulk_discount_drafts")
    .insert({
      title,
      rows,
      created_by: uid,
    })
    .select("id,title,rows,created_at,updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
  }

  return NextResponse.json({ draft: data })
}
