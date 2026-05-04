import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { DiscountManagerClient } from "@/components/discount-manager-client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { fetchServiceOrgDiscounts, getTreezEnv, normalizeDiscountRows } from "@/lib/treez"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let rows: Record<string, unknown>[] = []
  let error: string | null = null
  let status: number | undefined

  try {
    const env = getTreezEnv()
    const payload = await fetchServiceOrgDiscounts(env)
    rows = normalizeDiscountRows(payload)
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    error = err.message
    status = err.status
    if (err.body && typeof err.body === "object") {
      error = `${err.message}: ${JSON.stringify(err.body)}`
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/80 backdrop-blur px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link href="/dashboard" />}>Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Discounts</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/dashboard/discounts/create"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0C3D22] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0C3D22]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3D22] focus-visible:ring-offset-2"
            >
              Create Discount
            </Link>
            <Link 
              href="/dashboard/discounts/bulk-upload"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#0C3D22] px-4 text-sm font-semibold text-[#0C3D22] shadow-sm transition-colors hover:bg-[#0C3D22]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C3D22] focus-visible:ring-offset-2"
            >
              Bulk Upload
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8 lg:pt-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Discount manager
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Organization discounts from Treez{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /service/discount/v3/discount</code>
                . Use the type tabs to filter, expand a title for full JSON details, and paginate below the
                table.
              </p>
              {!error ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {rows.length} discount{rows.length === 1 ? "" : "s"} loaded for your organization.
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-destructive"
            >
              <p className="font-semibold">Could not load discounts{status ? ` (${status})` : ""}</p>
              <p className="mt-2 font-mono text-xs leading-relaxed opacity-90">{error}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Confirm <code className="rounded bg-muted px-1 py-0.5">TREEZ_CERT_ID</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">TREEZ_ORG_ID</code>, and private key in{" "}
                <code className="rounded bg-muted px-1 py-0.5">.env.local</code>. Your certificate must allow the
                org-level discount service endpoint.
              </p>
            </div>
          ) : (
            <DiscountManagerClient rows={rows} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
