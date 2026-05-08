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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Sales Promo
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            Collaborative promo docs with live editing. Admins create and share;
            managers only see documents shared with them.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" type="button" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New promo doc
          </Button>
        ) : null}
      </header>

      <div className="border-border bg-background overflow-hidden rounded-xl border">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-4 py-12 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading documents…
          </div>
        ) : docs.length === 0 ? (
          <div className="text-muted-foreground px-4 py-12 text-sm">
            {canManage
              ? "No promo documents yet — create one to collaborate in real time."
              : "Nothing has been shared with you yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[12rem]">Title</TableHead>
                {canManage ? (
                  <TableHead className="hidden md:table-cell">Creator</TableHead>
                ) : null}
                <TableHead className="hidden md:table-cell whitespace-nowrap">
                  Updated
                </TableHead>
                <TableHead className="text-end"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  {canManage ? (
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {creatorLabel(d.creator)}
                    </TableCell>
                  ) : null}
                  <TableCell className="hidden md:table-cell text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(d.updated_at)}
                  </TableCell>
                  <TableCell className="text-end whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <Link
                        href={`/dashboard/sales-promo/${d.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
                      >
                        Open
                      </Link>
                      {canManage ? (
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          title="Delete"
                          type="button"
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New promo document</DialogTitle>
            <DialogDescription>
              Opens the live editor. You can rename and share it from the doc page.
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
