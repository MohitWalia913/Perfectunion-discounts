import { NextResponse } from "next/server"
import { canCreateRole } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET() {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized", me: null }, { status: 401 })
  }
  if (!["master_admin", "admin", "manager"].includes(actor.role)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden", me: actor },
      { status: 403 },
    )
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    return NextResponse.json(
      {
        ok: false,
        error: `${msg} Add the service role key in Vercel (or .env.local) to load the full user list.`,
        me: actor,
        users: [],
      },
      { status: 500 },
    )
  }

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        me: actor,
        users: [],
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    me: actor,
    users: rows ?? [],
  })
}

export async function POST(request: Request) {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    email?: string
    password?: string
    full_name?: string
    role?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const full_name =
    typeof body.full_name === "string" ? body.full_name.trim() : ""
  const targetRole = body.role

  if (
    !email ||
    !password ||
    (targetRole !== "admin" && targetRole !== "manager")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "email, password, and role (admin or manager) are required",
      },
      { status: 400 },
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters" },
      { status: 400 },
    )
  }

  if (!canCreateRole(actor.role, targetRole)) {
    return NextResponse.json(
      { ok: false, error: "You cannot create users with this role" },
      { status: 403 },
    )
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY is not configured"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createErr || !created.user) {
    return NextResponse.json(
      { ok: false, error: createErr?.message ?? "Failed to create user" },
      { status: 400 },
    )
  }

  const userId = created.user.id

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      email,
      full_name: full_name || null,
      role: targetRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (upErr) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { ok: false, error: upErr.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      email,
      full_name: full_name || null,
      role: targetRole,
    },
  })
}
