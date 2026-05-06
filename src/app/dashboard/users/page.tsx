import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { UsersManagement } from "@/components/users-management"

export const metadata: Metadata = {
  title: "Users · Perfect Union",
}

export default function UsersPage() {
  return (
    <DashboardShell>
      <UsersManagement />
    </DashboardShell>
  )
}
