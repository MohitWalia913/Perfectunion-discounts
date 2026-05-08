import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardHelpPage } from "@/components/dashboard-help-page"

export const metadata: Metadata = {
  title: "Help · Perfect Union",
}

export default function HelpPage() {
  return (
    <DashboardShell>
      <DashboardHelpPage />
    </DashboardShell>
  )
}
