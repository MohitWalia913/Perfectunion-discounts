import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "How to use · Perfect Union",
}

export default function HowToUsePage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage title="How to use" />
    </DashboardShell>
  )
}
