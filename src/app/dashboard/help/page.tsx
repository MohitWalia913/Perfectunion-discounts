import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "Help · Perfect Union",
}

export default function HelpPage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage title="Help" />
    </DashboardShell>
  )
}
