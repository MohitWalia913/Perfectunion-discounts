"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DashboardKBar, DashboardKBarTrigger } from "@/components/dashboard-kbar"
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

type NavDef = (typeof SIDEBAR_NAV)[number] | (typeof MORE_NAV)[number] | (typeof HELP_NAV)[number]

/** Soft left-rail active state; icon-collapsed mode keeps a solid chip for clarity. */
const SIDEBAR_NAV_LINK_CLASS = cn(
  "border-l-[3px] border-l-transparent transition-[border-color,background-color,color,box-shadow] duration-150 ease-out",
  "data-active:border-primary data-active:bg-primary/[0.08] data-active:!text-foreground data-active:[&_svg]:!text-primary",
  "data-active:hover:bg-primary/[0.11] data-active:shadow-none",
  "group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:data-active:!bg-sidebar-primary group-data-[collapsible=icon]:data-active:!text-sidebar-primary-foreground group-data-[collapsible=icon]:data-active:[&_svg]:!text-sidebar-primary-foreground group-data-[collapsible=icon]:data-active:hover:!bg-sidebar-primary/92",
)

const SECTION_LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50"

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

function NavMenuItems({
  pathname,
  items,
}: {
  pathname: string
  items: readonly NavDef[]
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active = navLinkActive(pathname, href)
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={label}
              render={<Link href={href} />}
              className={SIDEBAR_NAV_LINK_CLASS}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </>
  )
}

const SIDEBAR_SURFACE_CLASS = cn(
  "[&_[data-slot=sidebar-inner]]:border-l [&_[data-slot=sidebar-inner]]:border-primary/[0.09]",
  "[&_[data-slot=sidebar-inner]]:bg-gradient-to-b [&_[data-slot=sidebar-inner]]:from-sidebar [&_[data-slot=sidebar-inner]]:via-sidebar [&_[data-slot=sidebar-inner]]:to-primary/[0.04]",
)

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
    <DashboardKBar>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Sidebar collapsible="icon" variant="inset" className={SIDEBAR_SURFACE_CLASS}>
          <SidebarHeader className="border-b border-sidebar-border/80 p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Perfect Union"
                  render={<Link href="/dashboard" />}
                  className="gap-3 rounded-xl border border-transparent transition-colors hover:border-primary/10 hover:bg-sidebar-accent/60"
                >
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-card to-primary/[0.07] p-0.5 shadow-sm ring-1 ring-primary/10">
                    <Image
                      src="/logo.webp"
                      alt=""
                      width={40}
                      height={40}
                      className="size-9 object-contain p-1.5"
                      priority
                    />
                  </span>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold tracking-tight text-sidebar-foreground">
                      Perfect Union
                    </span>
                    <span className="truncate text-[11px] text-sidebar-foreground/65">
                      Discount manager
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-x-hidden px-0">
            <SidebarGroup className="pb-0 pt-3">
              <SidebarGroupLabel className={SECTION_LABEL_CLASS}>Discounts</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <NavMenuItems pathname={pathname} items={SIDEBAR_NAV} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="py-2">
              <SidebarGroupLabel className={SECTION_LABEL_CLASS}>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <NavMenuItems pathname={pathname} items={MORE_NAV} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="pb-2 pt-1">
              <SidebarGroupLabel className={SECTION_LABEL_CLASS}>Guides</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <NavMenuItems pathname={pathname} items={HELP_NAV} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-0 border-t border-sidebar-border/80 bg-sidebar-accent/25 p-0">
            <SidebarGroup className="py-3">
              <SidebarGroupLabel className={cn(SECTION_LABEL_CLASS, "px-4")}>Session</SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <SidebarMenu className="gap-0.5">
                  {sidebarFooter}
                  <LogoutSidebarMenuItem />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset
          className={cn(
            "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0",
            "min-h-[100dvh] bg-gradient-to-br from-primary/[0.07] via-background to-background",
          )}
        >
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:px-4 lg:px-6">
            <Tooltip>
              <TooltipTrigger render={<SidebarTrigger className="-ml-0.5" />} />
              <TooltipContent side="bottom" align="start" sideOffset={6}>
                Open or close the sidebar
              </TooltipContent>
            </Tooltip>
            <div className="min-w-0 flex-1" aria-hidden />
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              <DashboardKBarTrigger />
            </div>
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
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors duration-150",
                  active
                    ? "bg-primary text-primary-foreground [&_svg]:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors duration-150",
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
    </DashboardKBar>
  )
}
