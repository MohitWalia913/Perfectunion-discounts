import { NextResponse } from "next/server"
import { canManageSalesPromo } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { userCanAccessSalesPromoDocument } from "@/lib/sales-promo/access"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type RouteCtx = { params: Promise<{ id: string }> }

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"])
const MAX_BYTES = 5 * 1024 * 1024

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/gif") return "gif"
  if (mime === "image/webp") return "webp"
  return "bin"
}

export async function POST(request: Request, ctx: RouteCtx) {
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

  const can = await userCanAccessSalesPromoDocument(admin, actor, documentId)
  if (!can) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  if (!canManageSalesPromo(actor)) {
    return NextResponse.json({ ok: false, error: "Only admins can upload images" }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data" }, { status: 400 })
  }

  const file = form.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 })
  }

  const mime = file.type || "application/octet-stream"
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { ok: false, error: "Only JPEG, PNG, GIF, or WebP images are allowed" },
      { status: 400 },
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image must be 5MB or smaller" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const ext = extForMime(mime)
  const objectPath = `${documentId}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await admin.storage
    .from("sales-promo-images")
    .upload(objectPath, buf, { contentType: mime, upsert: false })

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
  }

  const { data: pub } = admin.storage.from("sales-promo-images").getPublicUrl(objectPath)

  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
