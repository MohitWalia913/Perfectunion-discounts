import type { AppRole, ProfileRow } from "@/lib/auth/types"

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
