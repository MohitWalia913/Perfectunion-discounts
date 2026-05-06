import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "Users · Perfect Union",
}

export default function UsersPage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage title="Users" />
    </DashboardShell>
  )
}
