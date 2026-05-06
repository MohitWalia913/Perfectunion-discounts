import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardPlaceholderPage } from "@/components/dashboard-placeholder-page"

export const metadata: Metadata = {
  title: "Sales Promo · Perfect Union",
}

export default function SalesPromoPage() {
  return (
    <DashboardShell>
      <DashboardPlaceholderPage title="Sales Promo" />
    </DashboardShell>
  )
}
