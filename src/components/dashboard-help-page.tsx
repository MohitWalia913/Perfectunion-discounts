import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CircleHelpIcon,
  FileStackIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  MailIcon,
  MegaphoneIcon,
  SettingsIcon,
  SparklesIcon,
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
}: {
  href: string
  children: ReactNode
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
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
                Questions about discounts, drafts, publishing, or access? Reach the WebDS team by email. For
                step-by-step product guidance, start with{" "}
                <Link
                  href="/dashboard/how-to-use"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  How to use
                </Link>
                .
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
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className={cn(PAGE_MAX, "flex flex-1 flex-col gap-10 py-8 md:py-10 lg:py-11")}>
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                <SparklesIcon className="size-5 text-primary" aria-hidden />
                Get a faster answer
              </h2>
              <p className="text-sm text-muted-foreground">
                Include these details in your email so we can resolve your issue without back-and-forth.
              </p>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "What you were trying to do (e.g. bulk publish one row).",
              "Any error text on screen or in the toast notification.",
              "Rough time (and timezone) when it happened.",
              "Which page or menu you used — a screenshot helps.",
              "Your account email (never send passwords).",
              "For Treez issues: which store name or ID was selected.",
            ].map((t) => (
              <li
                key={t}
                className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 text-sm leading-snug text-muted-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shortcuts in this app
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <PageLink
              href="/dashboard/how-to-use"
              icon={BookOpenIcon}
              description="Guides for bulk discounts, Sales Promo, and users."
            >
              How to use
            </PageLink>
            <PageLink
              href="/dashboard"
              icon={LayoutGridIcon}
              description="Browse and manage existing discounts."
            >
              All discounts
            </PageLink>
            <PageLink
              href="/dashboard/discounts/bulk-upload"
              icon={UploadIcon}
              description="Create many discounts at once from the table."
            >
              Bulk upload discounts
            </PageLink>
            <PageLink
              href="/dashboard/discounts/drafts"
              icon={FileStackIcon}
              description="Save grids, publish rows, or schedule auto-publish."
            >
              Bulk drafts
            </PageLink>
            <PageLink
              href="/dashboard/sales-promo"
              icon={MegaphoneIcon}
              description="Collaborative promo documents with your team."
            >
              Sales Promo
            </PageLink>
            <PageLink href="/dashboard/users" icon={UsersIcon} description="Invite and manage teammates.">
              Users
            </PageLink>
            <PageLink
              href="/dashboard/settings"
              icon={SettingsIcon}
              description="Account and workspace preferences."
            >
              Settings
            </PageLink>
          </div>
        </section>

        <section
          className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] px-5 py-6 md:px-7"
        >
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CircleHelpIcon className="size-5 text-primary" aria-hidden />
            Common questions
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">Where is the product documentation?</dt>
              <dd className="mt-1 text-muted-foreground">
                Open <strong className="text-foreground">How to use</strong> in the sidebar for curated
                walkthroughs that match this dashboard.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Who do I contact for access or login problems?</dt>
              <dd className="mt-1 text-muted-foreground">
                Email <strong className="text-foreground">{SUPPORT_EMAIL}</strong>. An admin on your side may
                also need to adjust roles — we can coordinate once we know your account.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Do you offer phone support?</dt>
              <dd className="mt-1 text-muted-foreground">
                Primary support is by email so we can share links, screenshots, and follow-up clearly. If
                your organization has a separate support agreement, mention it in your message.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
