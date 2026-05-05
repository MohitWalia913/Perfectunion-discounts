"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CirclePlusIcon,
  LayoutGridIcon,
  UploadIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoutButton } from "@/components/logout-button"

/** Desktop header: Discounts + Bulk only (Create hidden per product request). */
const HEADER_NAV = [
  { href: "/dashboard", label: "Discounts", icon: LayoutGridIcon },
  {
    href: "/dashboard/discounts/bulk-upload",
    label: "Bulk create",
    icon: UploadIcon,
  },
] as const

/** Mobile dock keeps all destinations including Create. */
const MOBILE_NAV = [
  { href: "/dashboard", label: "Discounts", shortLabel: "Home", icon: LayoutGridIcon },
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
}: {
  children: React.ReactNode
  headerActions?: React.ReactNode
}) {
  const pathname = usePathname() || ""

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-background",
        "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0",
      )}
    >
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 shadow-sm">
        <div className="flex h-14 items-center gap-2 px-4 sm:gap-3 lg:px-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-lg outline-none ring-offset-background transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#1A1E26] focus-visible:ring-offset-2"
          >
            <span className="relative flex size-9 shrink-0 overflow-hidden rounded-lg bg-muted/50 shadow-sm ring-1 ring-border/50">
              <Image
                src="/logo.webp"
                alt="Perfect Union"
                width={36}
                height={36}
                className="object-contain p-1"
                priority
              />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Perfect Union
              </span>
              <span className="text-[11px] text-muted-foreground">Discount manager</span>
            </span>
          </Link>

          <nav
            className="hidden md:flex shrink-0 items-center gap-1"
            aria-label="Primary"
          >
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
              {HEADER_NAV.map(({ href, label, icon: Icon }) => {
                const active = navLinkActive(pathname, href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#1A1E26] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1" aria-hidden />

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {headerActions ? (
              <div className="flex items-center gap-2">{headerActions}</div>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/80 bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]"
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
                  active ? "text-[#1A1E26]" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-[#1A1E26]/12 text-[#1A1E26]" : "bg-muted/50 text-muted-foreground",
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
    </div>
  )
}
