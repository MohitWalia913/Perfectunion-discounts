"use client"

import * as React from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2Icon, MegaphoneIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

type Creator = {
  id: string
  email: string | null
  full_name: string | null
  role: string
} | null

type DocRow = {
  id: string
  title: string
  created_by: string
  created_at: string
  updated_at: string
  creator: Creator
}

export function SalesPromoList() {
  const [docs, setDocs] = React.useState<DocRow[]>([])
  const [canManage, setCanManage] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sales-promo/documents", {
        cache: "no-store",
        credentials: "same-origin",
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        documents?: DocRow[]
        canManage?: boolean
      }

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not load promo documents")
        setDocs([])
        setCanManage(false)
        return
      }

      setDocs(data.documents ?? [])
      setCanManage(!!data.canManage)
    } catch {
      toast.error("Network error loading documents")
      setDocs([])
      setCanManage(false)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function createDoc() {
    setCreating(true)
    try {
      const res = await fetch("/api/sales-promo/documents", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || undefined,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        document?: { id: string }
      }
      if (!res.ok || !data.ok || !data.document?.id) {
        toast.error(data.error ?? "Could not create document")
        return
      }
      toast.success("Promo document created")
      setCreateOpen(false)
      setNewTitle("")
      await load()
      window.location.href = `/dashboard/sales-promo/${data.document.id}`
    } catch {
      toast.error("Network error")
    } finally {
      setCreating(false)
    }
  }

  async function deleteDoc(id: string, title: string) {
    const ok = window.confirm(`Delete “${title}”? This cannot be undone.`)
    if (!ok) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/sales-promo/documents/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Delete failed")
        return
      }
      toast.success("Document deleted")
      await load()
    } catch {
      toast.error("Network error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sales Promo</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Live documents for promos and scripts. Admins can create and share; managers only see
            what is shared with them.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" type="button" className="shrink-0 gap-2 self-start lg:self-auto" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            New promo doc
          </Button>
        ) : null}
      </header>

      <div className="border-border/80 bg-muted/15 rounded-2xl border p-3 sm:p-4">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-16 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading documents…
          </div>
        ) : docs.length === 0 ? (
          <div className="text-muted-foreground px-2 py-16 text-center text-sm leading-relaxed">
            {canManage ? (
              <>
                <p>No promo documents yet.</p>
                <p className="mt-2">Create one to collaborate in real time.</p>
              </>
            ) : (
              <p>Nothing has been shared with you yet.</p>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => (
              <li key={d.id}>
                <article
                  className={cn(
                    "border-border/80 bg-card group flex h-full flex-col rounded-xl border shadow-sm transition-shadow",
                    "hover:border-border hover:shadow-md",
                  )}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <MegaphoneIcon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold tracking-tight">{d.title}</h2>
                      <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                        {canManage ? (
                          <p className="truncate">By {creatorLabel(d.creator)}</p>
                        ) : null}
                        <p className="whitespace-nowrap">Updated {formatDate(d.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-border/60 mt-auto flex items-center justify-end gap-2 border-t px-3 py-2">
                    <Link
                      href={`/dashboard/sales-promo/${d.id}`}
                      className={cn(buttonVariants({ variant: "default", size: "xs" }), "flex-1 sm:flex-none")}
                    >
                      Open
                    </Link>
                    {canManage ? (
                      <Button
                        variant="outline"
                        size="icon-xs"
                        title="Delete"
                        type="button"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === d.id}
                        onClick={() => void deleteDoc(d.id, d.title)}
                      >
                        {deletingId === d.id ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-3.5" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New promo document</DialogTitle>
            <DialogDescription>
              Opens the live editor. You can rename and share it from the document page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="pu-new-promo-title">Title (optional)</Label>
            <Input
              id="pu-new-promo-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. April BOGO script"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={creating} onClick={() => void createDoc()}>
              {creating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function creatorLabel(c: Creator): string {
  if (!c) return "—"
  const name = c.full_name?.trim()
  if (name) return name
  return c.email ?? c.id.slice(0, 8)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}
