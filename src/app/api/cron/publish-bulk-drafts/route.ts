/**
 * Intended for Vercel Cron or any scheduler: publishes bulk draft rows whose
 * `scheduledPublishDate` is today (UTC) and not yet published.
 *
 * Set env CRON_SECRET and send: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server"
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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 501 })
  }

  const auth = request.headers.get("authorization")?.trim()
  if (auth !== `Bearer ${secret}`) {
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

  let env
  try {
    env = getTreezEnv()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Treez env missing" },
      { status: 500 },
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: drafts, error: listErr } = await admin
    .from("bulk_discount_drafts")
    .select("id,rows")

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 })
  }

  let publishedCount = 0
  const details: { draftId: string; rowId: string; title: string; error?: string }[] = []

  for (const d of drafts ?? []) {
    if (!d?.id) continue
    let rows = deserializeBulkRows(d.rows)
    rows = rows.map((r) => recomputeRowMeta(r))
    let changed = false

    for (const row of rows) {
      if (row.publishedAt) continue
      if (!row.scheduledPublishDate || row.scheduledPublishDate > today) continue
      const v = validateBulkRow(row)
      if (!v.isValid) {
        details.push({
          draftId: d.id,
          rowId: row.id,
          title: row.title,
          error: v.error ?? "Invalid row",
        })
        continue
      }

      const [payload] = buildTreezPayloadsFromBulkRows([row]).map((p) => ({
        ...p,
        organizationId: env.orgId,
      }))

      try {
        await createServiceDiscount(env, payload)
        const ts = new Date().toISOString()
        rows = rows.map((r) =>
          r.id === row.id ? { ...r, publishedAt: ts, publishError: null } : r,
        )
        publishedCount += 1
        changed = true
        details.push({ draftId: d.id, rowId: row.id, title: row.title })
      } catch (e) {
        const msg = (e as Error).message || "Create failed"
        rows = rows.map((r) =>
          r.id === row.id ? { ...r, publishError: msg } : r,
        )
        changed = true
        details.push({ draftId: d.id, rowId: row.id, title: row.title, error: msg })
      }
    }

    if (isBulkDraftFullyPublished(rows)) {
      await admin.from("bulk_discount_drafts").delete().eq("id", d.id)
    } else if (changed) {
      await admin
        .from("bulk_discount_drafts")
        .update({
          rows: serializeBulkRows(rows),
          updated_at: new Date().toISOString(),
        })
        .eq("id", d.id)
    }
  }

  return NextResponse.json({
    ok: true,
    today,
    publishedRows: publishedCount,
    details,
  })
}
