"use client"

import * as React from "react"
import { format, isValid, parseISO, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { DiscountRow } from "@/lib/discount-fields"
import { getDiscountRowId, getDiscountTitle } from "@/lib/discount-fields"
import type {
  CollectionEntityDraft,
  DiscountEditDraft,
  StoreEntityDraft,
} from "@/lib/discount-edit-helpers"
import {
  mergeRowWithEditDraft,
  rowToEditDraft,
  sanitizeDiscountPayload,
} from "@/lib/discount-edit-helpers"
import { cn } from "@/lib/utils"
import { CalendarIcon, ChevronDownIcon, Loader2Icon, RocketIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

function parseDraftDate(iso: string): Date | undefined {
  const t = iso.trim()
  if (!t) return undefined
  try {
    const d = parseISO(t.length === 10 ? `${t}T12:00:00` : t)
    return isValid(d) ? d : undefined
  } catch {
    return undefined
  }
}

export function DiscountDashboardEditSheet(props: {
  open: boolean
  onOpenChange: (next: boolean) => void
  row: DiscountRow | null
  catalogStores: StoreEntityDraft[]
  catalogCollections: CollectionEntityDraft[]
  catalogsLoading: boolean
  saving: boolean
  onSavingChange: (v: boolean) => void
  /** Opens the existing delete confirmation flow (parent supplies row id). */
  onRequestDelete?: () => void
  /** When set, "Save as draft" updates this Supabase row; footer adds publish + discard. */
  resumeEditDraftId?: string | null
  initialSupabaseDraftTitle?: string
  onDraftPublished?: () => void
  onDraftDiscarded?: () => void
}) {
  const {
    open,
    onOpenChange,
    row,
    catalogStores,
    catalogCollections,
    catalogsLoading,
    saving,
    onSavingChange,
    onRequestDelete,
    resumeEditDraftId = null,
    initialSupabaseDraftTitle = "",
    onDraftPublished,
    onDraftDiscarded,
  } = props

  const [draft, setDraft] = React.useState<DiscountEditDraft | null>(null)
  const [storeSearch, setStoreSearch] = React.useState("")
  const [collectionSearch, setCollectionSearch] = React.useState("")

  React.useEffect(() => {
    if (!open || !row) {
      setDraft(null)
      return
    }
    setDraft(rowToEditDraft(row, catalogStores))
    setStoreSearch("")
    setCollectionSearch("")
  }, [open, row, catalogStores])

  const filteredCatalogStores = React.useMemo(() => {
    const q = storeSearch.trim().toLowerCase()
    if (!q) return catalogStores
    return catalogStores.filter((s) => s.name.toLowerCase().includes(q))
  }, [catalogStores, storeSearch])

  const filteredCatalogCollections = React.useMemo(() => {
    const q = collectionSearch.trim().toLowerCase()
    if (!q) return catalogCollections
    return catalogCollections.filter((c) => c.name.toLowerCase().includes(q))
  }, [catalogCollections, collectionSearch])

  function toggleStore(c: StoreEntityDraft, checked: boolean) {
    if (!draft) return
    setDraft({
      ...draft,
      stores: checked
        ? [...draft.stores.filter((s) => s.id !== c.id), c]
        : draft.stores.filter((s) => s.id !== c.id),
    })
  }

  function toggleCollection(c: CollectionEntityDraft, checked: boolean) {
    if (!draft) return
    setDraft({
      ...draft,
      collections: checked
        ? [...draft.collections.filter((x) => x.id !== c.id), c]
        : draft.collections.filter((x) => x.id !== c.id),
    })
  }

  function buildPayloadForApi(): Record<string, unknown> | null {
    if (!row || !draft) return null
    const id = getDiscountRowId(row)
    if (!id) {
      toast.error("Missing discount id")
      return null
    }
    if (draft.stores.length === 0) {
      toast.error("Select at least one store")
      return null
    }
    if (draft.collections.length === 0) {
      toast.error("Select at least one collection")
      return null
    }
    if (!draft.startDate.trim()) {
      toast.error("Start date is required")
      return null
    }
    const badStore = draft.stores.some((s) => !s.id || s.id.startsWith("name:"))
    if (badStore) {
      if (catalogStores.length === 0) {
        toast.error("Stores are still loading — try again in a moment.")
      } else {
        toast.error(
          "One or more locations could not be matched to IDs. Try reopening after stores finish loading.",
        )
      }
      return null
    }

    const merged = mergeRowWithEditDraft(row, draft)
    merged.id = id
    return sanitizeDiscountPayload(merged) as Record<string, unknown>
  }

  function defaultSupabaseDraftTitle(): string {
    if (!row) return "Untitled edit draft"
    const t = getDiscountTitle(row)
    return `Edit: ${t}`.slice(0, 200)
  }

  function draftListTitleForPublish(): string {
    const fromProp = initialSupabaseDraftTitle?.trim()
    if (fromProp) return fromProp.slice(0, 200)
    return defaultSupabaseDraftTitle()
  }

  async function publishResumeDraft() {
    const cleaned = buildPayloadForApi()
    if (!cleaned || !resumeEditDraftId || !row) return
    onSavingChange(true)
    try {
      const title = draftListTitleForPublish()
      const patchRes = await fetch(`/api/discount-edit-drafts/${resumeEditDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, payload: cleaned }),
      })
      const patchData = await patchRes.json()
      if (!patchRes.ok) throw new Error(patchData.error || "Could not sync draft")

      const pubRes = await fetch(`/api/discount-edit-drafts/${resumeEditDraftId}/publish`, {
        method: "POST",
      })
      const pubData = await pubRes.json()
      if (!pubRes.ok) {
        const first = pubData as { error?: string; details?: unknown }
        let detail = ""
        if (first.details != null) {
          detail =
            typeof first.details === "string"
              ? first.details
              : JSON.stringify(first.details)
        }
        throw new Error(
          detail ? `${first.error || "Publish failed"} — ${detail.slice(0, 400)}` : first.error || "Publish failed",
        )
      }

      toast.success("Published to Treez")
      onDraftPublished?.()
    } catch (e) {
      toast.error("Publish failed", { description: (e as Error).message })
    } finally {
      onSavingChange(false)
    }
  }

  async function discardSupabaseDraft() {
    if (!resumeEditDraftId) return
    if (!window.confirm("Discard this draft? This cannot be undone.")) return
    onSavingChange(true)
    try {
      const res = await fetch(`/api/discount-edit-drafts/${resumeEditDraftId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not discard draft")
      toast.success("Draft discarded")
      onDraftDiscarded?.()
    } catch (e) {
      toast.error("Could not discard draft", { description: (e as Error).message })
    } finally {
      onSavingChange(false)
    }
  }

  async function submit() {
    const cleaned = buildPayloadForApi()
    if (!cleaned || !row) return

    onSavingChange(true)
    try {
      const res = await fetch("/api/discounts/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discounts: [cleaned] }),
      })
      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Update failed")
      }

      const failed =
        typeof data.failed === "number"
          ? data.failed
          : typeof data.failed === "string"
            ? Number.parseInt(data.failed, 10)
            : 0

      if (failed > 0) {
        const rawErrors = data.errors
        const errArr = Array.isArray(rawErrors) ? rawErrors : []
        const first = errArr[0] as
          | { error?: string; details?: unknown; httpStatus?: number }
          | undefined
        const baseMsg = first?.error || "Update failed"
        let detail = ""
        if (first?.details != null && typeof first.details !== "undefined") {
          detail =
            typeof first.details === "string"
              ? first.details
              : JSON.stringify(first.details)
        }
        const hint =
          first?.httpStatus === 403
            ? " (HTTP 403 — certificate may lack discount update permission; ask Treez to enable PUT.)"
            : first?.httpStatus === 422
              ? " (HTTP 422 — request failed Treez validation; see details.)"
              : ""
        throw new Error(
          detail
            ? `${baseMsg}${hint} — ${detail.length > 450 ? `${detail.slice(0, 450)}…` : detail}`
            : `${baseMsg}${hint}`,
        )
      }

      toast.success("Discount updated")
      onOpenChange(false)
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      toast.error("Failed to update discount", {
        description: (e as Error).message,
      })
    } finally {
      onSavingChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg md:w-full md:max-w-xl",
          "data-[side=right]:border-l data-[side=right]:shadow-xl",
        )}
        showCloseButton
      >
        <SheetHeader className="shrink-0 gap-2 border-b border-border/80 px-4 py-4 text-left md:px-6">
          <SheetTitle>{resumeEditDraftId ? "Resume edit draft" : "Edit discount"}</SheetTitle>
          <SheetDescription>
            {resumeEditDraftId
              ? "Publish when you are ready to push these changes to Treez."
              : "Update locations, collections, schedule, and repeat — same repeat controls as bulk create."}
          </SheetDescription>
        </SheetHeader>

        {!draft || !row ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            {catalogsLoading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Loading catalog…
              </>
            ) : (
              "No discount selected."
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-5 px-4 py-5 md:px-6">
                <div className="space-y-2">
                  <Label htmlFor="ed-title">Title</Label>
                  <Input
                    id="ed-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed-amt">Percent amount</Label>
                  <Input
                    id="ed-amt"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                    className="max-w-[8rem]"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Stores</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex h-9 w-full max-w-md justify-between font-normal"
                        />
                      }
                    >
                      <span className="truncate">
                        {draft.stores.length === 0
                          ? "Select stores…"
                          : `${draft.stores.length} store${draft.stores.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[210] flex w-[min(calc(100vw-1.5rem),340px)] max-h-[min(70vh,360px)] flex-col gap-0 overflow-hidden p-0 shadow-lg"
                    >
                      <div className="shrink-0 border-b border-border bg-popover px-2 py-2">
                        <Input
                          placeholder="Search stores…"
                          value={storeSearch}
                          onChange={(e) => setStoreSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                        <div className="flex flex-col gap-px">
                          {filteredCatalogStores.map((s) => {
                            const sel = draft.stores.some((x) => x.id === s.id)
                            return (
                              <label
                                key={s.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/80"
                              >
                                <Checkbox
                                  checked={sel}
                                  onCheckedChange={(v) => toggleStore(s, v === true)}
                                />
                                <span className="text-sm leading-tight">{s.name}</span>
                              </label>
                            )
                          })}
                        </div>
                        {filteredCatalogStores.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            {catalogStores.length === 0
                              ? "No stores loaded from Treez yet."
                              : "No matching stores."}
                          </p>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Collections</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex h-9 w-full max-w-md justify-between font-normal"
                        />
                      }
                    >
                      <span className="truncate">
                        {draft.collections.length === 0
                          ? "Select collections…"
                          : `${draft.collections.length} collection${draft.collections.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[210] flex w-[min(calc(100vw-1.5rem),340px)] max-h-[min(70vh,360px)] flex-col gap-0 overflow-hidden p-0 shadow-lg"
                    >
                      <div className="shrink-0 border-b border-border bg-popover px-2 py-2">
                        <Input
                          placeholder="Search collections…"
                          value={collectionSearch}
                          onChange={(e) => setCollectionSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                        <div className="flex flex-col gap-px">
                          {filteredCatalogCollections.map((c) => {
                            const sel = draft.collections.some((x) => x.id === c.id)
                            return (
                              <label
                                key={c.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/80"
                              >
                                <Checkbox
                                  checked={sel}
                                  onCheckedChange={(v) => toggleCollection(c, v === true)}
                                />
                                <span className="line-clamp-2 text-sm leading-tight">{c.name}</span>
                              </label>
                            )
                          })}
                        </div>
                        {filteredCatalogCollections.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            {catalogCollections.length === 0
                              ? "No collections loaded from Treez yet."
                              : "No matching collections."}
                          </p>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start text-left font-normal",
                              !draft.startDate.trim() && "text-muted-foreground",
                            )}
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 size-4 shrink-0" />
                        {draft.startDate.trim()
                          ? draft.startDate
                          : "Pick date (required for save)"}
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[210] w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={parseDraftDate(draft.startDate)}
                          onSelect={(date) =>
                            setDraft({
                              ...draft,
                              startDate: date ? format(date, "yyyy-MM-dd") : "",
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start text-left font-normal",
                              !draft.endDate.trim() && "text-muted-foreground",
                            )}
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 size-4 shrink-0" />
                        {draft.endDate.trim() ? draft.endDate : "Pick date"}
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[210] w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={parseDraftDate(draft.endDate)}
                          onSelect={(date) =>
                            setDraft({
                              ...draft,
                              endDate: date ? format(date, "yyyy-MM-dd") : "",
                            })
                          }
                          disabled={(date) => {
                            const sd = draft.startDate.trim()
                            if (!sd) return false
                            const s = parseDraftDate(sd)
                            if (!s) return false
                            return startOfDay(date) < startOfDay(s)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Repeat</Label>
                  <p className="text-xs text-muted-foreground">
                    Same pattern as bulk create: turn recurrence on, then pick daily, weekly, or monthly.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant={draft.repeat ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 px-2.5 text-xs",
                          draft.repeat && "bg-[#1A1E26] hover:bg-[#1A1E26]/90",
                        )}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            repeat: true,
                            repeatType: "DAY",
                          })
                        }
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={!draft.repeat ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 px-2.5 text-xs",
                          !draft.repeat && "bg-[#1A1E26] hover:bg-[#1A1E26]/90",
                        )}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            repeat: false,
                            repeatType: "DO_NOT",
                          })
                        }
                      >
                        No
                      </Button>
                    </div>
                    {draft.repeat ? (
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="inline-flex h-8 min-w-0 max-w-full flex-1 items-center justify-between gap-1 px-2 text-left text-xs font-normal sm:max-w-[14rem]"
                            />
                          }
                        >
                          <span className="min-w-0 truncate">
                            {draft.repeatType === "DAY" && "Daily"}
                            {draft.repeatType === "WEEK" && "Weekly (same day)"}
                            {draft.repeatType === "MONTH" && "Monthly (same day)"}
                            {draft.repeatType === "DO_NOT" && "Daily"}
                          </span>
                          <ChevronDownIcon className="size-3 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent
                          className="z-[210] w-[220px] space-y-1 p-1.5"
                          align="start"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-8 w-full justify-start text-xs",
                              draft.repeatType === "DAY" && "bg-muted",
                            )}
                            onClick={() => setDraft({ ...draft, repeatType: "DAY" })}
                          >
                            Daily
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-8 w-full justify-start text-xs",
                              draft.repeatType === "WEEK" && "bg-muted",
                            )}
                            onClick={() => setDraft({ ...draft, repeatType: "WEEK" })}
                          >
                            Weekly (same day)
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-8 w-full justify-start text-xs",
                              draft.repeatType === "MONTH" && "bg-muted",
                            )}
                            onClick={() => setDraft({ ...draft, repeatType: "MONTH" })}
                          >
                            Monthly (same day)
                          </Button>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="shrink-0 border-t border-border/80 px-4 py-4 md:px-6">
              <div className="flex w-full flex-col gap-3">
                {resumeEditDraftId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto sm:self-start"
                    disabled={saving}
                    onClick={() => void discardSupabaseDraft()}
                  >
                    <Trash2Icon className="mr-2 size-4" />
                    Discard draft
                  </Button>
                ) : onRequestDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto sm:self-start"
                    disabled={
                      saving || !row || !getDiscountRowId(row)
                    }
                    onClick={() => onRequestDelete()}
                  >
                    <Trash2Icon className="mr-2 size-4" />
                    Delete discount
                  </Button>
                ) : null}
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  {resumeEditDraftId ? (
                    <Button
                      type="button"
                      className="gap-2 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
                      disabled={saving || catalogsLoading}
                      onClick={() => void publishResumeDraft()}
                    >
                      {saving ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <RocketIcon className="size-4" />
                      )}
                      Publish to Treez
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={saving || catalogsLoading}
                      onClick={() => void submit()}
                    >
                      {saving ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
