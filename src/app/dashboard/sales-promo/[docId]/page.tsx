import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { SalesPromoCollabRoom } from "@/components/sales-promo-collab-room"

export const metadata: Metadata = {
  title: "Sales Promo document · Perfect Union",
}

export default async function SalesPromoDocPage({
  params,
}: {
  params: Promise<{ docId: string }>
}) {
  const { docId } = await params

  return (
    <DashboardShell>
      <SalesPromoCollabRoom docId={docId} />
    </DashboardShell>
  )
}
