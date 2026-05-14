import { NextResponse } from "next/server"
import { rejectIfManager } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { buildTreezPayloadsFromBulkRows } from "@/lib/bulk-discount-payload"
import {
  buildTreezPutPayloadFromBulkRow,
  extractTreezDiscountIdFromResponse,
  snapshotForTreezPutBase,
} from "@/lib/bulk-discount-treez-put"
import {
  deserializeBulkRows,
  isBulkDraftFullyPublished,
  recomputeRowMeta,
  serializeBulkRows,
  validateBulkRow,
  type BulkDiscountRow,
} from "@/lib/bulk-discount-io"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { createServiceDiscount, getTreezEnv, updateServiceDiscount } from "@/lib/treez"

const BETWEEN_TREEZ_MS = 150

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

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

  type Op = "create" | "update"
  const toProcess: { row: BulkDiscountRow; op: Op }[] = []
  const skipped: { title: string; ok: false; error: string; op: "skip" }[] = []

  for (const row of rows) {
    if (filterIds && !filterIds.has(row.id)) continue
    const v = validateBulkRow(row)
    if (!v.isValid) continue

    const published = !!(row.publishedAt && String(row.publishedAt).trim())
    const tid = (row.treezDiscountId ?? "").trim()

    if (published && !tid) {
      skipped.push({
        title: row.title,
        ok: false,
        op: "skip",
        error:
          "Cannot sync: row is marked live but has no Treez id. Re-import from live discounts or publish from a fresh row.",
      })
      continue
    }

    toProcess.push({ row, op: tid ? "update" : "create" })
  }

  if (toProcess.length === 0) {
    return NextResponse.json(
      {
        error: "No eligible rows to publish (must be valid; legacy live rows need a Treez id to update).",
        published: 0,
        skipped,
      },
      { status: 400 },
    )
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

  const results: { title: string; ok: boolean; error?: string; op: Op | "skip" }[] = [...skipped]

  for (let i = 0; i < toProcess.length; i++) {
    if (i > 0) await delay(BETWEEN_TREEZ_MS)
    const { row: brQueued, op } = toProcess[i]
    const br = rows.find((r) => r.id === brQueued.id) ?? brQueued

    if (op === "update") {
      const tid = (br.treezDiscountId ?? "").trim()
      try {
        const putPayload = buildTreezPutPayloadFromBulkRow(br, tid)
        if (putPayload.organizationId == null) putPayload.organizationId = env.orgId
        const putResBody = await updateServiceDiscount(env, putPayload)
        results.push({ title: br.title, ok: true, op: "update" })
        const ts = new Date().toISOString()
        const nextBase = snapshotForTreezPutBase(putResBody)
        rows = rows.map((r) =>
          r.id === br.id
            ? {
                ...r,
                publishedAt: ts,
                publishError: null,
                treezDiscountId: tid,
                treezPutBase: nextBase ?? r.treezPutBase,
              }
            : r,
        )
      } catch (e) {
        const err = e as Error & { message?: string }
        const msg = err.message || "Update failed"
        results.push({ title: br.title, ok: false, error: msg, op: "update" })
        rows = rows.map((r) => (r.id === br.id ? { ...r, publishError: msg } : r))
      }
      continue
    }

    const payloads = buildTreezPayloadsFromBulkRows([br]).map((p) => ({
      ...p,
      organizationId: env.orgId,
    }))
    const payload = payloads[0]
    try {
      const bodyJson = await createServiceDiscount(env, payload)
      results.push({ title: br.title, ok: true, op: "create" })
      const ts = new Date().toISOString()
      const newId = extractTreezDiscountIdFromResponse(bodyJson)
      const nextBase = snapshotForTreezPutBase(bodyJson)
      rows = rows.map((r) =>
        r.id === br.id
          ? {
              ...r,
              publishedAt: ts,
              publishError: null,
              treezDiscountId: newId || r.treezDiscountId,
              treezPutBase: nextBase ?? r.treezPutBase,
            }
          : r,
      )
    } catch (e) {
      const err = e as Error & { message?: string }
      const msg = err.message || "Create failed"
      results.push({ title: br.title, ok: false, error: msg, op: "create" })
      rows = rows.map((r) => (r.id === br.id ? { ...r, publishError: msg } : r))
    }
  }

  const fullyPublished = isBulkDraftFullyPublished(rows)
  const { error: saveErr } = fullyPublished
    ? await admin.from("bulk_discount_drafts").delete().eq("id", draftId)
    : await admin
        .from("bulk_discount_drafts")
        .update({
          rows: serializeBulkRows(rows),
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId)

  if (saveErr) {
    return NextResponse.json(
      { error: saveErr.message, partialResults: results },
      { status: 500 },
    )
  }

  const okCount = results.filter((r) => r.ok).length
  const created = results.filter((r) => r.ok && r.op === "create").length
  const updated = results.filter((r) => r.ok && r.op === "update").length
  return NextResponse.json({
    ok: true,
    published: okCount,
    created,
    updated,
    total: results.length,
    results,
    draftRemoved: fullyPublished,
  })
}
