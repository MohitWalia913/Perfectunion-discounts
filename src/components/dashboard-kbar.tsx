"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  useRegisterActions,
  type Action,
} from "kbar"
import {
  FileStackIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  MegaphoneIcon,
  SearchIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function DashboardKBarResults() {
  const { results } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item}
          </div>
        ) : (
          <div
            className={cn(
              "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
              active ? "bg-primary/[0.09] text-foreground" : "text-foreground",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground [&_svg]:size-4">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.name}</span>
              {item.subtitle ? (
                <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
              ) : null}
            </span>
            {item.shortcut?.length ? (
              <span className="hidden shrink-0 gap-1 sm:flex">
                {item.shortcut.map((sc) => (
                  <kbd
                    key={sc}
                    className="rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {sc}
                  </kbd>
                ))}
              </span>
            ) : null}
          </div>
        )
      }
    />
  )
}

function RegisterKBarActions({ managerMode }: { managerMode: boolean }) {
  const router = useRouter()

  const actions = React.useMemo<Action[]>(() => {
    const all: Action[] = [
      {
        id: "nav-discounts",
        name: "All discounts",
        subtitle: "Browse and filter percent discounts",
        section: "Navigation",
        keywords: "home dashboard discounts list",
        icon: <LayoutGridIcon aria-hidden />,
        perform: () => {
          router.push("/dashboard")
        },
      },
      {
        id: "nav-bulk-upload",
        name: "Import database",
        subtitle: "Create many discounts from the grid",
        section: "Navigation",
        keywords: "import database bulk upload spreadsheet",
        icon: <UploadIcon aria-hidden />,
        perform: () => router.push("/dashboard/discounts/bulk-upload"),
      },
      {
        id: "nav-drafts",
        name: "Bulk drafts",
        subtitle: "Saved grids, publish, schedule",
        section: "Navigation",
        keywords: "draft saved publish schedule",
        icon: <FileStackIcon aria-hidden />,
        perform: () => router.push("/dashboard/discounts/drafts"),
      },
      {
        id: "nav-sales-promo",
        name: "Sales Promo",
        subtitle: "Collaborative promo workspace",
        section: "Navigation",
        keywords: "promo marketing documents",
        icon: <MegaphoneIcon aria-hidden />,
        perform: () => router.push("/dashboard/sales-promo"),
      },
      {
        id: "nav-users",
        name: "Users",
        subtitle: "Invite and manage teammates",
        section: "Navigation",
        keywords: "accounts roles admin manager",
        icon: <UsersIcon aria-hidden />,
        perform: () => router.push("/dashboard/users"),
      },
      {
        id: "nav-help",
        name: "Help & support",
        subtitle: "Contact and shortcuts",
        section: "Navigation",
        keywords: "support email documentation",
        icon: <HelpCircleIcon aria-hidden />,
        perform: () => router.push("/dashboard/help"),
      },
    ]

    if (managerMode) {
      const keep = new Set(["nav-discounts", "nav-sales-promo", "nav-help"])
      return all.filter((a) => keep.has(a.id))
    }
    return all
  }, [router, managerMode])

  useRegisterActions(actions, [actions])

  return null
}

export function DashboardKBarTrigger({ className }: { className?: string }) {
  const { query } = useKBar()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => query.toggle()}
            className={cn(
              "h-9 shrink-0 border-border/80 bg-muted/30 shadow-sm hover:bg-muted/50",
              className,
            )}
            aria-label="Search pages and actions"
          >
            <SearchIcon className="size-4" aria-hidden />
          </Button>
        }
      />
      <TooltipContent side="bottom" align="end" sideOffset={6}>
        Search pages · Cmd+K / Ctrl+K
      </TooltipContent>
    </Tooltip>
  )
}

export function DashboardKBar({
  children,
  managerMode = false,
}: {
  children: React.ReactNode
  managerMode?: boolean
}) {
  return (
    <KBarProvider
      options={{
        enableHistory: true,
        animations: { enterMs: 120, exitMs: 80 },
      }}
    >
      <RegisterKBarActions managerMode={managerMode} />
      {children}
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-[200] flex justify-center bg-foreground/25 p-4 pt-[14vh] backdrop-blur-[2px]">
          <KBarAnimator className="w-full max-w-lg origin-top overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10">
            <div className="flex items-center border-b border-border/80 px-3">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <KBarSearch
                className="h-12 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
                defaultPlaceholder="Jump to a page or action…"
              />
            </div>
            <div className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
              <DashboardKBarResults />
            </div>
            <div className="border-t border-border/80 bg-muted/25 px-4 py-2 text-[10px] text-muted-foreground">
              <span className="select-none">Navigate · </span>
              <kbd className="rounded border border-border bg-background px-1">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1">↓</kbd>
              <span className="select-none"> select · </span>
              <kbd className="rounded border border-border bg-background px-1">↵</kbd>
              <span className="select-none"> open · </span>
              <kbd className="rounded border border-border bg-background px-1">esc</kbd>
              <span className="select-none"> close</span>
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </KBarProvider>
  )
}
