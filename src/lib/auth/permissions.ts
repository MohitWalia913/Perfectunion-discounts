import { NextResponse } from "next/server"
import type { AppRole, ProfileRow } from "@/lib/auth/types"

/** Create promo docs, list everyone’s docs, manage shares, delete docs. */
export function canManageSalesPromo(actor: ProfileRow): boolean {
  return actor.role === "master_admin" || actor.role === "admin"
}

export function canCreateRole(actor: AppRole, target: AppRole): boolean {
  if (actor === "manager") return false
  if (actor === "master_admin") return target === "admin" || target === "manager"
  if (actor === "admin") return target === "manager"
  return false
}

export function canDeleteUser(actor: ProfileRow, target: ProfileRow): boolean {
  if (actor.role === "manager") return false
  if (actor.id === target.id) return false
  if (target.role === "master_admin") return false
  if (actor.role === "admin") return target.role === "manager"
  if (actor.role === "master_admin")
    return target.role === "admin" || target.role === "manager"
  return false
}

/** Admins may change which stores / promo shares belong to a manager account. */
export function canConfigureManagerAccess(actor: ProfileRow, target: ProfileRow): boolean {
  if (actor.role === "manager") return false
  if (target.role !== "manager") return false
  return actor.role === "admin" || actor.role === "master_admin"
}

export function rejectUnlessAuthenticated(
  actor: ProfileRow | null,
): NextResponse | null {
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  return null
}

/** Block mutation routes for dashboard managers (read-only operators). */
export function rejectIfManager(
  actor: ProfileRow | null,
): NextResponse | null {
  const u = rejectUnlessAuthenticated(actor)
  if (u) return u
  if (actor!.role === "manager") {
    return NextResponse.json(
      { ok: false, error: "Managers have read-only access" },
      { status: 403 },
    )
  }
  return null
}
