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
    .from("discount_edit_drafts")
    .select("id,title,discount_id,payload,published_at,created_at,updated_at")
    .eq("created_by", uid)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ drafts: data ?? [] })
}

export async function POST(request: Request) {
  const actor = await getCurrentProfile()
  const denied = rejectIfManager(actor)
  if (denied) return denied
  const uid = actor!.id

  let body: { title?: unknown; discount_id?: unknown; payload?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const discountId =
    typeof body.discount_id === "string" && body.discount_id.trim()
      ? body.discount_id.trim()
      : ""
  if (!discountId) {
    return NextResponse.json({ error: "discount_id is required" }, { status: 400 })
  }

  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return NextResponse.json({ error: "payload must be a discount object" }, { status: 400 })
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Untitled edit draft"

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
    .from("discount_edit_drafts")
    .insert({
      title,
      discount_id: discountId,
      payload: body.payload,
      created_by: uid,
    })
    .select("id,title,discount_id,payload,published_at,created_at,updated_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 })
  }

  return NextResponse.json({ draft: data })
}
