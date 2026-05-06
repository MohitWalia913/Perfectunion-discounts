export type AppRole = "master_admin" | "admin" | "manager"

export type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  created_at: string
}
