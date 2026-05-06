import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "Preferences · Perfect Union",
}

export default function SettingsPreferencesPage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage
        title="Preferences"
        description="Personal preferences and defaults will appear here."
      />
    </DashboardShell>
  )
}
