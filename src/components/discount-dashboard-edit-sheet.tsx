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
import { getDiscountRowId } from "@/lib/discount-fields"
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
import { CalendarIcon, ChevronDownIcon, Loader2Icon, Trash2Icon } from "lucide-react"
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

  async function submit() {
    if (!row || !draft) return
    const id = getDiscountRowId(row)
    if (!id) {
      toast.error("Missing discount id")
      return
    }
    if (draft.stores.length === 0) {
      toast.error("Select at least one store")
      return
    }
    if (draft.collections.length === 0) {
      toast.error("Select at least one collection")
      return
    }
    if (!draft.startDate.trim()) {
      toast.error("Start date is required")
      return
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
      return
    }

    onSavingChange(true)
    try {
      const merged = mergeRowWithEditDraft(row, draft)
      merged.id = id
      const cleaned = sanitizeDiscountPayload(merged) as Record<string, unknown>

      const res = await fetch("/api/discounts/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discounts: [cleaned] }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Update failed")
      }

      if (data.failed > 0) {
        const errMsg = data.errors?.[0]?.error || "Update failed"
        throw new Error(errMsg)
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
          <SheetTitle>Edit discount</SheetTitle>
          <SheetDescription>
            Update locations, collections, schedule, and repeat — same repeat controls as bulk create.
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
                {onRequestDelete ? (
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
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
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
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
