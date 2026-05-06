import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "Settings · Perfect Union",
}

export default function SettingsPage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage title="Settings" description="General organization and app settings will appear here." />
    </DashboardShell>
  )
}
