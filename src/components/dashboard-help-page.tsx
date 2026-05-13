"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ActionTooltip } from "@/components/action-tooltip"
import {
  ArrowUpRightIcon,
  FileStackIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  MailIcon,
  MegaphoneIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Support address — adjust the domain to match your mail host if needed. */
export const SUPPORT_EMAIL = "aelran@mwgholdings.com"

const PAGE_MAX = "mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8"

function PageLink({
  href,
  children,
  description,
  icon: Icon,
  tooltip,
}: {
  href: string
  children: ReactNode
  description: string
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
}) {
  return (
    <ActionTooltip label={tooltip} side="top">
      <Link
        href={href}
        className={cn(
          "group flex gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors",
          "hover:border-primary/25 hover:bg-primary/[0.03]",
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/12 bg-primary/[0.06] text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 font-medium text-foreground group-hover:text-primary">
            {children}
            <ArrowUpRightIcon
              className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
        </span>
      </Link>
    </ActionTooltip>
  )
}

export function DashboardHelpPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Perfect Union portal — support request")}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-primary/10 bg-gradient-to-br from-primary/[0.07] via-background to-background">
        <div className={cn(PAGE_MAX, "flex flex-col gap-6 py-8 md:py-10 lg:py-11")}>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/15 bg-primary/[0.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
            <LifeBuoyIcon className="size-3.5" aria-hidden />
            Help &amp; support
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-12">
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                We&apos;re here to help
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px] lg:text-base">
                Questions about discounts, drafts, publishing, or access? Reach the MGWHOLDINGS team by email, or use
                the search bar in the header (keyboard: Cmd+K on Mac, Ctrl+K on Windows) to jump anywhere in the
                app.
              </p>
            </div>

            <aside className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 shadow-md md:p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <MailIcon className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact support
                  </p>
                  <p className="break-all text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    <a href={mailto} className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We read every message and reply as soon as we can during business hours.
                  </p>
                  <ActionTooltip label={`Copy address or open ${SUPPORT_EMAIL} in your mail app.`} side="top">
                    <a
                      href={mailto}
                      className={cn(
                        buttonVariants({ size: "default" }),
                        "mt-4 inline-flex w-full justify-center gap-2 sm:w-auto",
                      )}
                    >
                      <MailIcon className="size-4" aria-hidden />
                      Email support
                    </a>
                  </ActionTooltip>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className={cn(PAGE_MAX, "flex flex-1 flex-col gap-10 py-8 md:py-10 lg:py-11")}>
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shortcuts in this app
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <PageLink
              href="/dashboard"
              icon={LayoutGridIcon}
              description="Browse and manage existing discounts."
              tooltip="Go to the discount manager: filters, edit in Treez, and pagination."
            >
              All discounts
            </PageLink>
            <PageLink
              href="/dashboard/discounts/bulk-upload"
              icon={UploadIcon}
              description="Create many discounts at once from the table."
              tooltip="Open Import database to add many discounts before saving or publishing."
            >
              Import database
            </PageLink>
            <PageLink
              href="/dashboard/discounts/drafts"
              icon={FileStackIcon}
              description="Save grids, publish rows, or schedule auto-publish."
              tooltip="List saved bulk drafts; open one to publish or schedule rows."
            >
              Bulk drafts
            </PageLink>
            <PageLink
              href="/dashboard/sales-promo"
              icon={MegaphoneIcon}
              description="Collaborative promo documents with your team."
              tooltip="Sales Promo — open the shared promo workspace (more help here later)."
            >
              Sales Promo
            </PageLink>
            <PageLink
              href="/dashboard/users"
              icon={UsersIcon}
              description="Invite and manage teammates."
              tooltip="Invite users, assign Admin or Manager, refresh the roster."
            >
              Users
            </PageLink>
          </div>
        </section>
      </div>
    </div>
  )
}
