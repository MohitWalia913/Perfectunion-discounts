"use client"

import * as React from "react"
import Link from "next/link"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense"
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
import { Loader2Icon, ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"
import type { ProfileRow } from "@/lib/auth/types"
import { salesPromoRoomId } from "@/lib/sales-promo/room"

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

function SalesPromoTiptap() {
  const liveblocks = useLiveblocksExtension()
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      liveblocks,
      StarterKit.configure({ undoRedo: false }),
      Placeholder.configure({ placeholder: "Write the promo…" }),
    ],
  })
  const ready = useIsEditorReady()

  if (!editor || !ready) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-16 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Connecting editor…
      </div>
    )
  }

  return (
    <div className="relative min-h-[50vh]">
      <div className="border-border sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-[var(--background)] pb-2">
        <Toolbar editor={editor} />
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-4 py-4 [&_.ProseMirror]:min-h-[40vh] [&_.ProseMirror]:outline-none"
      />
    </div>
  )
}

function PromoDocChrome({
  docId,
}: {
  docId: string
}) {
  const [title, setTitle] = React.useState("")
  const [canManage, setCanManage] = React.useState(false)
  const [shares, setShares] = React.useState<ShareRow[]>([])
  const [users, setUsers] = React.useState<ProfileRow[]>([])
  const [sharePick, setSharePick] = React.useState("")
  const [loading, setLoading] = React.useState(true)

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
      toast.success("Title saved")
    } catch {
      toast.error("Network error")
    }
  }

  async function addShare(userId: string) {
    if (!userId) return
    try {
      const res = await fetch(`/api/sales-promo/documents/${docId}/share`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        share?: ShareRow["profile"]
      }
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
      toast.success("Access removed")
    } catch {
      toast.error("Network error")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-2">
          <Link
            href="/dashboard/sales-promo"
            aria-label="Back to Sales Promo"
            className="border-border bg-background hover:bg-muted mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Sales Promo
            </div>
            <Input
              value={title}
              disabled={loading}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void saveTitle(title.trim() || "Untitled promo")}
              className="h-10 max-w-xl text-lg font-semibold md:text-xl"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading…
        </div>
      ) : null}

      {canManage ? (
        <aside className="border-border mx-4 rounded-xl border p-4 md:mx-6">
          <h2 className="text-sm font-medium">Sharing</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Managers only see promo docs you explicitly share below.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-1">
              <span className="text-muted-foreground text-xs">
                Grant access (internal users from Users list)
              </span>
              <select
                className="border-border bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={sharePick}
                onChange={(e) => setSharePick(e.target.value)}
              >
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.full_name?.trim() || u.email || u.id).slice(0, 72)} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!sharePick}
              onClick={() => void addShare(sharePick)}
            >
              Share
            </Button>
          </div>
          {shares.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {shares.map((s) => (
                <li
                  key={s.user_id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 truncate">
                    {s.profile?.full_name?.trim() || s.profile?.email || s.user_id}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={() => void removeShare(s.user_id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              Only admins see this promo until you share it with someone.
            </p>
          )}
        </aside>
      ) : null}

    </div>
  )
}

export function SalesPromoCollabRoom({ docId }: { docId: string }) {
  const roomId = salesPromoRoomId(docId)
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <PromoDocChrome docId={docId} />
      <RoomProvider id={roomId}>
        <ClientSideSuspense
          fallback={
            <div className="text-muted-foreground flex items-center gap-2 px-4 py-8 text-sm md:px-6">
              <Loader2Icon className="size-4 animate-spin" />
              Connecting to live session…
            </div>
          }
        >
          <main className="border-border bg-background mx-4 mb-6 overflow-hidden rounded-xl border md:mx-6">
            <SalesPromoTiptap />
          </main>
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
