import { NextResponse } from "next/server"
import { canCreateRole } from "@/lib/auth/permissions"
import type { AppRole } from "@/lib/auth/types"
import { getCurrentProfile } from "@/lib/auth/profile"
import { createServiceRoleClient } from "@/lib/supabase/admin"

function validRole(x: unknown): x is AppRole {
  return x === "master_admin" || x === "admin" || x === "manager"
}

export async function GET() {
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!["master_admin", "admin", "manager"].includes(actor.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
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

  if (!email || !password || !validRole(targetRole)) {
    return NextResponse.json(
      { ok: false, error: "email, password, and valid role are required" },
      { status: 400 },
    )
  }

  if (!canCreateRole(actor.role, targetRole)) {
    return NextResponse.json(
      { ok: false, error: "You cannot create users with this role" },
      { status: 403 },
    )
  }

  const admin = createServiceRoleClient()
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
