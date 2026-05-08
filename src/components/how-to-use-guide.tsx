"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  MegaphoneIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** Shared width + horizontal padding so hero and tabs/content align vertically. */
const PAGE_MAX = "mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8"

const HOW_TO_TAB_TRIGGER_CLASS = cn(
  "relative inline-flex h-auto min-h-10 w-full max-w-none items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium leading-snug sm:min-h-9 sm:py-2 sm:text-sm",
  "flex-none basis-auto",
  "text-muted-foreground [&_svg]:shrink-0 [&_svg]:text-current [&_svg]:opacity-85",
  "transition-colors hover:bg-primary/12 hover:text-primary hover:[&_svg]:opacity-100",
  "data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm",
  "data-active:[&_svg]:text-primary-foreground data-active:[&_svg]:opacity-100",
  "data-active:hover:bg-primary/92 data-active:hover:text-primary-foreground data-active:hover:[&_svg]:text-primary-foreground",
)

function GuideLink({
  href,
  children,
  variant = "default",
}: {
  href: string
  children: ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: variant === "outline" ? "outline" : "default",
          size: "sm",
        }),
        "inline-flex shrink-0 gap-1.5",
      )}
    >
      {children}
      <ArrowUpRightIcon className="size-3.5 opacity-80" aria-hidden />
    </Link>
  )
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3",
        "text-sm leading-relaxed text-foreground",
      )}
      role="note"
    >
      <p className="font-medium text-primary">{title}</p>
      <div className="mt-2 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </aside>
  )
}

function OrderedSteps({ children }: { children: ReactNode }) {
  return (
    <ol className="ms-4 list-decimal space-y-3 marker:font-semibold marker:text-primary">
      {children}
    </ol>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground marker:text-primary/70">
      {items.map((t) => (
        <li key={t} className="leading-relaxed">
          {t}
        </li>
      ))}
    </ul>
  )
}

export function HowToUseGuide() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Hero */}
      <div className="border-b border-primary/10 bg-gradient-to-br from-primary/[0.06] via-background to-background">
        <div className={cn(PAGE_MAX, "flex flex-col gap-4 py-8 md:py-10 lg:py-11")}>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/15 bg-primary/[0.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
            <BookOpenIcon className="size-3.5" aria-hidden />
            Documentation
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              How to use
            </h1>
            <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-[15px] lg:text-base">
              Operational guides aligned with this dashboard — bulk discount creation, Sales Promo
              collaboration, and user administration.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className={cn(PAGE_MAX, "flex flex-1 flex-col gap-8 py-8 md:py-10 lg:py-11")}>
        <Tabs defaultValue="bulk" className="flex w-full flex-col gap-8">
          {/*
           * TabsList default includes group-data-horizontal/tabs:h-8 which pins the rail to 32px while
           * triggers often need more height — override so the pill stretches with its children.
           */}
          <TabsList
            className={cn(
              "grid h-auto min-h-0 w-full shrink-0 grid-cols-1 gap-1.5 rounded-xl border border-primary/12 bg-muted/40 p-1.5 shadow-sm sm:grid-cols-3 sm:p-1.5 sm:gap-1",
              "items-stretch justify-center group-data-horizontal/tabs:h-auto",
            )}
          >
            <TabsTrigger value="bulk" className={HOW_TO_TAB_TRIGGER_CLASS}>
              <UploadIcon className="size-4" aria-hidden />
              Bulk create discounts
            </TabsTrigger>
            <TabsTrigger value="promo" className={HOW_TO_TAB_TRIGGER_CLASS}>
              <MegaphoneIcon className="size-4" aria-hidden />
              Sales Promo
            </TabsTrigger>
            <TabsTrigger value="users" className={HOW_TO_TAB_TRIGGER_CLASS}>
              <UsersIcon className="size-4" aria-hidden />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="mt-0 rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="space-y-6 border-b border-primary/10 bg-primary/[0.03] px-5 py-5 md:px-7 md:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    Bulk create discounts
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Use the Bulk upload discounts screen to compose many discounts in one table. Each row
                    becomes a discount created through Treez via{" "}
                    <code className="rounded-md bg-muted px-1 py-0.5 text-xs">POST /api/discounts/bulk</code>
                    .
                  </p>
                </div>
                <GuideLink href="/dashboard/discounts/bulk-upload">Open bulk upload</GuideLink>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/80 bg-background">
                <table className="w-full min-w-[520px] text-left text-[11px] sm:text-xs">
                  <caption className="sr-only">
                    Columns in the bulk discount table matching the dashboard
                  </caption>
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">
                        Column
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">
                        Requirement
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">
                        Behaviour
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Type</td>
                      <td className="px-3 py-2 text-muted-foreground">Required selection</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Fun Friday, Hotbox, Daily Special, or Custom (dictates how Title is built).
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Title</td>
                      <td className="px-3 py-2 text-muted-foreground">Derived or manual</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Read-only preview for presets; editable when Type is Custom.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">%</td>
                      <td className="px-3 py-2 text-muted-foreground">Required (&gt; 0)</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Percent discount amount; must parse as a number greater than zero.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Stores</td>
                      <td className="px-3 py-2 text-muted-foreground">At least one</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Multi-select with search — maps to store customizations per discount.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Start</td>
                      <td className="px-3 py-2 text-muted-foreground">Required date</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Schedule begins at midnight; included in preset title formatting.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">End</td>
                      <td className="px-3 py-2 text-muted-foreground">Optional</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        If empty, defaults to Start; cannot be before Start. Hotbox titles use both dates.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Repeat</td>
                      <td className="px-3 py-2 text-muted-foreground">Yes / No</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        When Yes: Daily, Weekly (same day), or Monthly (same day). No sends DO_NOT repeat.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">Collections</td>
                      <td className="px-3 py-2 text-muted-foreground">At least one</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Multi-select with search — product collections scoped to each discount.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Callout title="Title patterns (preset types)">
                <BulletList
                  items={[
                    'Fun Friday: "FUN FRIDAY ON {START} - {pct}% OFF" (start formatted as shown in the table).',
                    'Hotbox: "HOTBOX ON {START} TO {END} END - {pct}% OFF" (End falls back to Start if omitted).',
                    'Daily Special: "{FIRST_COLLECTION} - {pct}% OFF" (first selected collection in the row).',
                    "Custom: you must enter the full title manually in the Title field.",
                  ]}
                />
              </Callout>
            </div>

            <div className="space-y-6 px-5 py-6 md:px-7 md:py-8">
              <section>
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                  Procedure
                </h3>
                <OrderedSteps>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Open Bulk upload discounts</span> from the sidebar
                    or dock. Wait until stores and collections finish loading (spinners disappear).
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Configure each row</span> using the columns above.
                    Invalid rows remain disabled for submission until title, percentage, stores, start, and
                    collections are satisfied.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Extend the worksheet</span> with{" "}
                    <strong className="text-foreground">Add row</strong> (toolbar or footer). Minimum one
                    row is always enforced; deleting the last remaining row shows an error toast.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Confirm eligibility before submit:</span> count valid
                    rows from the footer (e.g. “N valid”). Invalid rows remain excluded automatically; revisit
                    any row still showing placeholders such as Select… or Fill fields….
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Choose Create discounts.</span> Payloads schedule
                    each discount all day ({" "}
                    <code className="rounded-md bg-muted px-1 py-0.5 text-xs">startTime</code>
                    /
                    <code className="rounded-md bg-muted px-1 py-0.5 text-xs">endTime</code> wrap the
                    calendar day) with percent method and your selected repeat cadence when enabled.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Review the Results panel:</span> summaries show
                    total / successful / failed; expand failed rows for messages and optional JSON detail.
                    When every row succeeds, you are routed back to the main discounts dashboard after a
                    short delay.
                  </li>
                </OrderedSteps>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="promo" className="mt-0 rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="space-y-6 border-b border-primary/10 bg-primary/[0.03] px-5 py-5 md:px-7 md:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    Sales Promo documents
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Live TipTap editors backed by Liveblocks: real-time typing, threaded comments,
                    collaborator presence, and optional sharing controls for admins.
                  </p>
                </div>
                <GuideLink href="/dashboard/sales-promo">Open Sales Promo</GuideLink>
              </div>

              <Callout title="Who can do what">
                <p>
                  <strong>Master admins and admins</strong> can create documents, manage the share list,
                  and delete promo docs they control.{" "}
                  <strong>Managers</strong> only see docs that were explicitly shared — the list stays
                  empty until an admin invites them into a room.
                </p>
              </Callout>
            </div>

            <div className="space-y-6 px-5 py-6 md:px-7 md:py-8">
              <section>
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                  Procedure
                </h3>
                <OrderedSteps>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Land on Sales Promo.</span> The grid lists every doc
                    you may access together with creator metadata and freshness timestamps.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Create a document</span> via{" "}
                    <strong className="text-foreground">New promo doc</strong> (admins/master admins).
                    Optionally name it in the dialog; omitting the title still provisions a workspace and
                    opens the collaborative editor route for you.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Collaborate:</span> the document view syncs edits,
                    shows who is editing, and exposes floating comment threads plus rich text/table tools when
                    you need structured promo scripting.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Share with teammates:</span> use the Share affordance.
                    Desktop panels and the mobile Share sheet pull selectable teammates from{" "}
                    <code className="rounded-md bg-muted px-1 py-0.5 text-xs">/api/users</code>,
                    enqueue selections, remove prior shares when necessary, then confirm success to unlock
                    the room for recipients.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Navigate back anytime</span> through the breadcrumbs
                    or list entry — rooms resolve by document id ({` /dashboard/sales-promo/[id] `}).{" "}
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Delete safely:</span> admins may remove stale promos.
                    Confirmation is required because deletion is irreversible.
                  </li>
                </OrderedSteps>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0 rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="space-y-6 border-b border-primary/10 bg-primary/[0.03] px-5 py-5 md:px-7 md:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    Create and manage users
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Provision Supabase-backed accounts straight from this workspace. Invitees authenticate
                    immediately because email confirmation happens server-side — deliver temporary passwords
                    through a trusted channel only.
                  </p>
                </div>
                <GuideLink href="/dashboard/users">Open Users</GuideLink>
              </div>

              <Callout title="Role escalation rules">
                <BulletList
                  items={[
                    "Master admins can create Admin or Manager accounts and may remove admins or managers (excluding themselves).",
                    "Regular admins create Manager accounts only and may remove managers they provisioned.",
                    "Managers have read-only roster access — they cannot add or delete teammates.",
                  ]}
                />
              </Callout>
            </div>

            <div className="space-y-6 px-5 py-6 md:px-7 md:py-8">
              <section>
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                  Procedure
                </h3>
                <OrderedSteps>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Authenticate as an elevated role</span> — only master
                    admins and admins expose the Invite controls; managers merely review the roster.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Populate the roster context</span> with Refresh if an
                    environment warning appears (missing service role keys can block pagination even though{" "}
                    <strong>Add user</strong> may still operate once configured).
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Choose Add user</span> — the modal opens with fields
                    for email, temporary password (auto-generated on open), optional full name, and a role
                    select limited to whichever roles your account may grant.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Harden passwords:</span> click{" "}
                    <strong className="text-foreground">Generate</strong> to rotate a cryptographic string,
                    or supply your own compliant secret (six characters minimum enforced before submit).
                    Copy credentials before closing the modal.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Confirm Create user.</span> Successful calls refresh
                    the table and toast that the invitee may sign in without waiting on email confirmations.
                  </li>
                  <li className="ps-2 text-muted-foreground">
                    <span className="text-foreground">Maintain hygiene:</span> remove departed teammates when
                    your policy allows deletion. Self-service or destructive actions targeting master admins
                    are blocked to protect tenancy controls.
                  </li>
                </OrderedSteps>
              </section>

              <section className="rounded-xl border border-dashed border-primary/25 bg-muted/20 px-4 py-4 text-sm">
                <p className="font-medium text-foreground">Operational reminder</p>
                <p className="mt-2 text-muted-foreground">
                  The Users grid mirrors email, optional full name, role badge, signup date, and allowed
                  delete actions — document any custom onboarding wording you share alongside the temporary
                  password so managers know whom to escalate for Supabase resets.
                </p>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
