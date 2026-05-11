import { NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { formatTreezApiError, getTreezEnv, updateServiceDiscount } from "@/lib/treez"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase admin not configured" },
      { status: 500 },
    )
  }

  const { id: draftId } = await params

  const { data: row, error: fetchErr } = await admin
    .from("discount_edit_drafts")
    .select("id,created_by,discount_id,payload,published_at")
    .eq("id", draftId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!row || row.created_by !== actor.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (row.published_at) {
    return NextResponse.json({ error: "Already published" }, { status: 400 })
  }

  const payload = row.payload as Record<string, unknown> | null
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid stored payload" }, { status: 500 })
  }

  const putId = String(payload.id ?? row.discount_id ?? "").trim()
  if (!putId) {
    return NextResponse.json({ error: "Payload missing discount id" }, { status: 400 })
  }

  let env
  try {
    env = getTreezEnv()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Treez env missing" },
      { status: 500 },
    )
  }

  const toSend = { ...payload, id: putId }

  try {
    await updateServiceDiscount(env, toSend)
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    return NextResponse.json(
      {
        error: formatTreezApiError(e),
        details: err.body,
        httpStatus: err.status,
      },
      { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 502 },
    )
  }

  const publishedAt = new Date().toISOString()
  const { error: saveErr } = await admin
    .from("discount_edit_drafts")
    .update({
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq("id", draftId)

  if (saveErr) {
    return NextResponse.json(
      { error: saveErr.message, note: "Treez update succeeded but draft was not marked published." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, publishedAt })
}
