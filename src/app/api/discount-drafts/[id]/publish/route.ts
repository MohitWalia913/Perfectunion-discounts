import { NextResponse } from "next/server"
import { rejectIfManager } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { buildTreezPayloadsFromBulkRows } from "@/lib/bulk-discount-payload"
import {
  deserializeBulkRows,
  isBulkDraftFullyPublished,
  recomputeRowMeta,
  serializeBulkRows,
  validateBulkRow,
  type BulkDiscountRow,
} from "@/lib/bulk-discount-io"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { createServiceDiscount, getTreezEnv } from "@/lib/treez"

export async function POST(
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

  const { id: draftId } = await params

  const { data: draftRow, error: fetchErr } = await admin
    .from("bulk_discount_drafts")
    .select("id,created_by,rows,title")
    .eq("id", draftId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!draftRow || draftRow.created_by !== uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: { rowIds?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const filterIds =
    Array.isArray(body.rowIds) && body.rowIds.length > 0
      ? new Set(body.rowIds.filter((x): x is string => typeof x === "string"))
      : null

  let rows = deserializeBulkRows(draftRow.rows)
  rows = rows.map((r) => recomputeRowMeta(r))

  const toPublish: BulkDiscountRow[] = []
  for (const row of rows) {
    if (filterIds && !filterIds.has(row.id)) continue
    if (row.publishedAt) continue
    const v = validateBulkRow(row)
    if (!v.isValid) continue
    toPublish.push(row)
  }

  if (toPublish.length === 0) {
    return NextResponse.json({
      error: "No eligible rows to publish (must be valid and not already published).",
      published: 0,
    }, { status: 400 })
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

  const payloads = buildTreezPayloadsFromBulkRows(toPublish).map((p) => ({
    ...p,
    organizationId: env.orgId,
  }))

  const results: { title: string; ok: boolean; error?: string }[] = []

  for (let i = 0; i < toPublish.length; i++) {
    const br = toPublish[i]
    const payload = payloads[i]
    try {
      await createServiceDiscount(env, payload)
      results.push({ title: br.title, ok: true })
      const ts = new Date().toISOString()
      rows = rows.map((r) =>
        r.id === br.id
          ? { ...r, publishedAt: ts, publishError: null }
          : r,
      )
    } catch (e) {
      const err = e as Error & { message?: string }
      const msg = err.message || "Create failed"
      results.push({ title: br.title, ok: false, error: msg })
      rows = rows.map((r) =>
        r.id === br.id ? { ...r, publishError: msg } : r,
      )
    }
  }

  const fullyPublished = isBulkDraftFullyPublished(rows)
  const { error: saveErr } = fullyPublished
    ? await admin.from("bulk_discount_drafts").delete().eq("id", draftId)
    : await admin.from("bulk_discount_drafts").update({
        rows: serializeBulkRows(rows),
        updated_at: new Date().toISOString(),
      }).eq("id", draftId)

  if (saveErr) {
    return NextResponse.json(
      { error: saveErr.message, partialResults: results },
      { status: 500 },
    )
  }

  const okCount = results.filter((r) => r.ok).length
  return NextResponse.json({
    ok: true,
    published: okCount,
    total: results.length,
    results,
    draftRemoved: fullyPublished,
  })
}
