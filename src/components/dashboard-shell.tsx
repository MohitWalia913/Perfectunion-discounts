"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  CirclePlusIcon,
  FileStackIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoutSidebarMenuItem } from "@/components/logout-button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const MORE_NAV = [
  {
    href: "/dashboard/sales-promo",
    label: "Sales Promo",
    icon: MegaphoneIcon,
  },
  { href: "/dashboard/users", label: "Users", icon: UsersIcon },
] as const

const HELP_NAV = [
  { href: "/dashboard/how-to-use", label: "How to use", icon: BookOpenIcon },
  { href: "/dashboard/help", label: "Help", icon: HelpCircleIcon },
] as const

const SIDEBAR_NAV = [
  { href: "/dashboard", label: "All discounts", icon: LayoutGridIcon },
  {
    href: "/dashboard/discounts/bulk-upload",
    label: "Bulk upload discounts",
    icon: UploadIcon,
  },
  {
    href: "/dashboard/discounts/drafts",
    label: "Bulk drafts",
    icon: FileStackIcon,
  },
] as const

/** Mobile dock keeps all destinations including Create. */
const MOBILE_NAV = [
  {
    href: "/dashboard",
    label: "Discounts",
    shortLabel: "Home",
    icon: LayoutGridIcon,
  },
  {
    href: "/dashboard/discounts/bulk-upload",
    label: "Bulk create",
    shortLabel: "Bulk",
    icon: UploadIcon,
  },
  {
    href: "/dashboard/discounts/create",
    label: "Create discount",
    shortLabel: "Create",
    icon: CirclePlusIcon,
  },
] as const

function navLinkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/"
  }
  return pathname === href
}

export function DashboardShell({
  children,
  headerActions,
  sidebarFooter,
}: {
  children: React.ReactNode
  headerActions?: React.ReactNode
  /** Extra `SidebarMenuItem`s rendered above logout (e.g. Refresh on the discounts page). */
  sidebarFooter?: React.ReactNode
}) {
  const pathname = usePathname() || ""

  const collapseForBulk =
    pathname === "/dashboard/discounts/bulk-upload" ||
    pathname.startsWith("/dashboard/discounts/bulk-upload/") ||
    pathname === "/dashboard/discounts/drafts" ||
    pathname.startsWith("/dashboard/discounts/drafts/")

  const [open, setOpen] = React.useState(!collapseForBulk)

  React.useEffect(() => {
    setOpen(!collapseForBulk)
  }, [collapseForBulk])

  return (
    <>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="border-b border-sidebar-border p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Perfect Union"
                  render={<Link href="/dashboard" />}
                >
                  <span className="relative flex size-8 shrink-0 overflow-hidden rounded-md bg-muted/50 ring-1 ring-sidebar-border/60">
                    <Image
                      src="/logo.webp"
                      alt=""
                      width={32}
                      height={32}
                      className="object-contain p-1"
                      priority
                    />
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Perfect Union</span>
                    <span className="truncate text-xs text-sidebar-foreground/75">
                      Discount manager
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {SIDEBAR_NAV.map(({ href, label, icon: Icon }) => {
                    const active = navLinkActive(pathname, href)
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          render={<Link href={href} />}
                        >
                          <Icon aria-hidden />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                  {MORE_NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          render={<Link href={href} />}
                        >
                          <Icon aria-hidden />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                  {HELP_NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          render={<Link href={href} />}
                        >
                          <Icon aria-hidden />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              {sidebarFooter}
              <LogoutSidebarMenuItem />
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset
          className={cn(
            "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0",
          )}
        >
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:px-4 lg:px-6">
            <SidebarTrigger className="-ml-0.5" />
            <div className="min-w-0 flex-1" aria-hidden />
            {headerActions ? (
              <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
            ) : null}
          </header>

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] md:hidden"
        aria-label="Primary mobile"
      >
        <div className="flex h-16 items-stretch justify-around px-1 pt-1">
          {MOBILE_NAV.map(({ href, shortLabel, icon: Icon }) => {
            const active = navLinkActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground [&_svg]:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                </span>
                <span className="truncate">{shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
