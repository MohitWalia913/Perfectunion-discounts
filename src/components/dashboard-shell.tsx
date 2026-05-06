"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  ChevronRightIcon,
  CirclePlusIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  Settings2Icon,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const SETTINGS_BASE = "/dashboard/settings"

const MORE_NAV = [
  {
    href: "/dashboard/sales-promo",
    label: "Sales Promo",
    icon: MegaphoneIcon,
  },
  { href: "/dashboard/users", label: "Users", icon: UsersIcon },
] as const

const SETTINGS_SUB = [
  { href: "/dashboard/settings", label: "General" },
  { href: "/dashboard/settings/preferences", label: "Preferences" },
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

function routeStartsWith(pathname: string, base: string): boolean {
  if (pathname === base) return true
  return pathname.startsWith(`${base}/`)
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
  const underSettings = routeStartsWith(pathname, SETTINGS_BASE)
  const [settingsOpen, setSettingsOpen] = React.useState(underSettings)
  const prevPathForSettings = React.useRef(pathname)

  React.useEffect(() => {
    const was = prevPathForSettings.current
    prevPathForSettings.current = pathname
    const wasIn = routeStartsWith(was, SETTINGS_BASE)
    const nowIn = routeStartsWith(pathname, SETTINGS_BASE)
    if (!wasIn && nowIn) setSettingsOpen(true)
    if (wasIn && !nowIn) setSettingsOpen(false)
  }, [pathname])

  const showSettingsSub = settingsOpen || underSettings

  const collapseForBulk =
    pathname === "/dashboard/discounts/bulk-upload" ||
    pathname.startsWith("/dashboard/discounts/bulk-upload/")

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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      className="justify-between"
                      tooltip="Settings"
                      isActive={underSettings}
                      onClick={() => setSettingsOpen((o) => !o)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Settings2Icon aria-hidden className="shrink-0" />
                        <span className="truncate">Settings</span>
                      </span>
                      <ChevronRightIcon
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          showSettingsSub && "rotate-90",
                        )}
                      />
                    </SidebarMenuButton>
                    {showSettingsSub ? (
                      <SidebarMenuSub>
                        {SETTINGS_SUB.map(({ href, label }) => {
                          const subActive = pathname === href
                          return (
                            <SidebarMenuSubItem key={href}>
                              <SidebarMenuSubButton
                                isActive={subActive}
                                render={<Link href={href} />}
                              >
                                <span>{label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
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

          <div className="flex flex-1 flex-col">{children}</div>
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
                    ? "text-[#1A1E26]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-[#1A1E26]/12 text-[#1A1E26]"
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
