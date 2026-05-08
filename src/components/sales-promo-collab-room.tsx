"use client"

import * as React from "react"
import Link from "next/link"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useOthers,
  useSelf,
  useSyncStatus,
} from "@liveblocks/react/suspense"
import {
  Toolbar,
  useIsEditorReady,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap"
import "@liveblocks/react-tiptap/styles.css"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
} from "@/components/ui/sheet"
import { Loader2Icon, ArrowLeftIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"
import type { ProfileRow } from "@/lib/auth/types"
import { salesPromoRoomId } from "@/lib/sales-promo/room"
import { cn } from "@/lib/utils"

type ShareRow = {
  user_id: string
  created_at: string
  profile: {
    id: string
    email: string | null
    full_name: string | null
    role: string
  } | null
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return `${p[0]!.slice(0, 1)}${p[1]!.slice(0, 1)}`.toUpperCase()
  const one = p[0] ?? "?"
  return one.slice(0, Math.min(2, one.length)).toUpperCase()
}

function CollaborationHud() {
  const self = useSelf()
  const others = useOthers()
  const sync = useSyncStatus({ smooth: true })

  const badges = React.useMemo(() => {
    const rows: Array<{ key: string; name: string; color?: string | null }> = []
    if (self?.info?.name && typeof self.info.name === "string") {
      const color =
        typeof self.info.color === "string" && self.info.color ? self.info.color : null
      rows.push({
        key: `self:${self.connectionId}`,
        name: self.info.name,
        color,
      })
    }

    for (const u of others) {
      const name = typeof u.info?.name === "string" ? u.info.name : "Guest"
      const color =
        typeof u.info?.color === "string" && u.info.color ? u.info.color : null
      rows.push({ key: `o:${u.connectionId}`, name, color })
    }
    return rows
  }, [self, others])

  const syncLabel =
    sync === "synchronizing"
      ? "Saving…"
      : sync === "synchronized" || sync === "has-local-changes"
        ? "Synced"
        : "Connecting…"

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {badges.length ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Editing
          </span>
          <div className="flex items-center justify-end -space-x-2">
            {badges.slice(0, 8).map((b) => (
              <div
                key={b.key}
                title={b.name}
                style={{ background: b.color ?? "var(--muted-foreground)" }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white shadow-sm",
                )}
              >
                {initialsFromName(b.name)}
              </div>
            ))}
            {badges.length > 8 ? (
              <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold">
                +{badges.length - 8}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
          sync === "synchronizing"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            : "border-border/60 bg-background/60 text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            sync === "synchronizing"
              ? "bg-amber-500"
              : sync === "synchronized" || sync === "has-local-changes"
                ? "bg-emerald-500"
                : "bg-muted-foreground/50",
          )}
          aria-hidden
        />
        <span className="text-foreground/80">{syncLabel}</span>
      </div>
    </div>
  )
}

function SalesPromoTiptap() {
  const liveblocks = useLiveblocksExtension()
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      liveblocks,
      StarterKit.configure({ undoRedo: false }),
      Placeholder.configure({ placeholder: "Start writing your promo…" }),
    ],
  })
  const ready = useIsEditorReady()

  if (!editor || !ready) {
    return (
      <div className="text-muted-foreground flex min-h-[min(60vh,900px)] items-center justify-center gap-2 px-6 py-16 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Connecting editor…
      </div>
    )
  }

  return (
    <div className="flex min-h-[min(60vh,900px)] flex-col">
      <div className="border-border/80 bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur md:px-4">
        <Toolbar editor={editor} />
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "max-w-none px-4 py-6 sm:px-8 sm:py-10",
          // Starter-kit-like doc typography without requiring @tailwindcss/typography
          "[&_.ProseMirror]:min-h-[min(52vh,820px)] [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-7",
          "[&_.ProseMirror]:text-foreground/90 [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:tracking-tight",
          "[&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold",
          "[&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold",
          "[&_.ProseMirror_p]:my-2",
          "[&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ol]:my-3",
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground",
        )}
      />
    </div>
  )
}

function SharingPanel({
  canManage,
  users,
  sharePick,
  setSharePick,
  shares,
  onShare,
  onRemove,
}: {
  canManage: boolean
  users: ProfileRow[]
  sharePick: string
  setSharePick: (v: string) => void
  shares: ShareRow[]
  onShare: () => void
  onRemove: (userId: string) => void
}) {
  if (!canManage) return null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Sharing</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Managers only see docs you share with them.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Add people
          </span>
          <select
            className="border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring h-10 w-full rounded-lg border px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={sharePick}
            onChange={(e) => setSharePick(e.target.value)}
          >
            <option value="">Select someone…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.full_name?.trim() || u.email || u.id).slice(0, 80)} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!sharePick}
          onClick={onShare}
        >
          Share
        </Button>
      </div>

      <div className="border-border/80 bg-muted/20 rounded-xl border p-3">
        {shares.length ? (
          <ul className="space-y-2 text-sm">
            {shares.map((s) => (
              <li
                key={s.user_id}
                className="border-border/60 flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">
                    {s.profile?.full_name?.trim() || s.profile?.email || s.user_id}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {(s.profile?.role ?? "").replaceAll("_", " ")}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={() => onRemove(s.user_id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground text-xs leading-relaxed">
            This promo is visible to admins until you invite teammates.
          </div>
        )}
      </div>
    </div>
  )
}

function PromoConnectingSkeleton() {
  return (
    <div className="bg-muted/20 flex min-h-0 flex-1 flex-col">
      <div className="border-border bg-background/90 h-14 border-b backdrop-blur" />
      <div className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="border-border mt-10 w-full max-w-[800px] rounded-xl border bg-card px-10 py-12 shadow-sm">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Connecting to collaboration…
          </div>
        </div>
      </div>
    </div>
  )
}

function PromoDocWorkspace({ docId }: { docId: string }) {
  const [title, setTitle] = React.useState("")
  const [canManage, setCanManage] = React.useState(false)
  const [shares, setShares] = React.useState<ShareRow[]>([])
  const [users, setUsers] = React.useState<ProfileRow[]>([])
  const [sharePick, setSharePick] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [mobileShareOpen, setMobileShareOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/sales-promo/documents/${docId}`, {
          credentials: "same-origin",
          cache: "no-store",
        })
        const data = (await res.json()) as {
          ok?: boolean
          error?: string
          document?: { title: string }
          canManage?: boolean
          shares?: ShareRow[]
        }
        if (!res.ok || !data.ok || !data.document || cancelled) {
          toast.error(data.error ?? "Could not load this document")
          return
        }
        setTitle(data.document.title)
        setCanManage(!!data.canManage)
        setShares(Array.isArray(data.shares) ? data.shares : [])
        if (data.canManage) {
          const u = await fetch("/api/users", { credentials: "same-origin", cache: "no-store" })
          const uj = (await u.json()) as { ok?: boolean; users?: ProfileRow[] }
          if (uj.ok && uj.users && !cancelled) setUsers(uj.users ?? [])
        }
      } catch {
        if (!cancelled) toast.error("Network error loading document")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [docId])

  async function saveTitle(next: string) {
    try {
      const res = await fetch(`/api/sales-promo/documents/${docId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not rename")
        return
      }
    } catch {
      toast.error("Network error")
    }
  }

  async function shareNow() {
    if (!sharePick) return
    try {
      const res = await fetch(`/api/sales-promo/documents/${docId}/share`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: sharePick }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not share")
        return
      }
      toast.success("Shared")
      setSharePick("")
      const refreshed = await fetch(`/api/sales-promo/documents/${docId}`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      const rj = (await refreshed.json()) as { ok?: boolean; shares?: ShareRow[] }
      if (rj.ok) setShares(rj.shares ?? [])
      setMobileShareOpen(false)
    } catch {
      toast.error("Network error")
    }
  }

  async function removeShare(userId: string) {
    try {
      const res = await fetch(
        `/api/sales-promo/documents/${docId}/share?user_id=${encodeURIComponent(userId)}`,
        { method: "DELETE", credentials: "same-origin" },
      )
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not remove share")
        return
      }
      setShares((s) => s.filter((row) => row.user_id !== userId))
    } catch {
      toast.error("Network error")
    }
  }

  const sharePanelProps = {
    canManage,
    users,
    sharePick,
    setSharePick,
    shares,
    onShare: () => void shareNow(),
    onRemove: (id: string) => void removeShare(id),
  }

  return (
    <div className={cn("bg-muted/20 flex min-h-0 flex-1 flex-col")}>
      <header className="border-border/80 sticky top-0 z-30 shrink-0 border-b bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
            <Link
              href="/dashboard/sales-promo"
              aria-label="Back to Sales Promo"
              className="border-border/80 hover:bg-muted/60 mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background/60 shadow-sm sm:mt-0"
            >
              <ArrowLeftIcon className="size-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Sales Promo
              </div>
              <Input
                value={title}
                disabled={loading}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void saveTitle(title.trim() || "Untitled promo")}
                className="mt-1 h-10 w-full max-w-full border-transparent bg-transparent px-0 text-lg font-semibold tracking-tight shadow-none sm:text-xl md:max-w-[640px] md:text-2xl"
                placeholder="Untitled promo"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {canManage ? (
              <div className="xl:hidden">
                <Sheet open={mobileShareOpen} onOpenChange={setMobileShareOpen}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMobileShareOpen(true)}
                  >
                    <Share2Icon className="size-4" />
                    Share
                  </Button>
                  <SheetContent side="right" className="w-[min(420px,100vw)] sm:max-w-md">
                    <div className="px-2 pt-2 pb-1">
                      <SharingPanel {...sharePanelProps} />
                    </div>
                    <SheetFooter className="pt-2">
                      <SheetClose render={<Button type="button" variant="secondary" className="w-full" />}>
                        Done
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            ) : null}

            <CollaborationHud />
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-1 gap-0 xl:grid-cols-[1fr_320px]">
        <main className="min-h-0 overflow-y-auto px-3 py-4 sm:px-4 lg:px-6">
          <div className="border-border/80 bg-card mx-auto w-full max-w-[800px] overflow-hidden rounded-xl border shadow-sm">
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-6 py-12 text-sm">
                <Loader2Icon className="size-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <SalesPromoTiptap />
            )}
          </div>
        </main>

        {canManage ? (
          <aside className="border-border/80 hidden min-h-0 overflow-y-auto border-t bg-background/60 px-4 py-5 xl:block xl:border-l xl:border-t-0">
            <SharingPanel {...sharePanelProps} />
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export function SalesPromoCollabRoom({ docId }: { docId: string }) {
  const roomId = salesPromoRoomId(docId)
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId}>
        <ClientSideSuspense fallback={<PromoConnectingSkeleton />}>
          <PromoDocWorkspace docId={docId} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
