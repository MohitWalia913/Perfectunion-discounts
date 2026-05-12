"use client"

import * as React from "react"
import { canConfigureManagerAccess, canCreateRole, canDeleteUser } from "@/lib/auth/permissions"
import type { AppRole, ProfileRow } from "@/lib/auth/types"
import type { ProfileWithShares } from "@/lib/manager-promo-shares"
import { Button } from "@/components/ui/button"
import { ActionTooltip } from "@/components/action-tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"

function roleLabel(r: AppRole): string {
  switch (r) {
    case "master_admin":
      return "Master admin"
    case "admin":
      return "Admin"
    case "manager":
      return "Manager"
    default:
      return r
  }
}

function generateSecurePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  const out: string[] = []
  const buf = new Uint8Array(18)
  crypto.getRandomValues(buf)
  for (let i = 0; i < buf.length; i++) {
    out.push(chars[buf[i]! % chars.length])
  }
  return out.join("")
}

type UsersApiPayload = {
  ok?: boolean
  error?: string
  me?: ProfileRow | null
  users?: ProfileWithShares[]
}

function parseStoreNamesFromApiPayload(body: unknown): string[] {
  let storesData: unknown = body
  if (storesData && typeof storesData === "object" && !Array.isArray(storesData)) {
    const o = storesData as Record<string, unknown>
    storesData = o.data ?? o.entities ?? o.results ?? []
  }
  if (!Array.isArray(storesData)) return []
  const names = new Set<string>()
  for (const s of storesData) {
    if (!s || typeof s !== "object") continue
    const r = s as Record<string, unknown>
    const name = String(
      r.name ?? r.displayName ?? r.entityName ?? r.organizationEntityName ?? "",
    ).trim()
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function UsersManagement() {
  const [users, setUsers] = React.useState<ProfileWithShares[]>([])
  const [me, setMe] = React.useState<ProfileRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [role, setRole] = React.useState<"admin" | "manager">("manager")

  const [orgStoreNames, setOrgStoreNames] = React.useState<string[]>([])
  const [storesLoading, setStoresLoading] = React.useState(false)
  const [storeSearchCreate, setStoreSearchCreate] = React.useState("")
  const [storeSearchEdit, setStoreSearchEdit] = React.useState("")
  const [promoDocs, setPromoDocs] = React.useState<{ id: string; title: string }[]>([])
  const [promoLoading, setPromoLoading] = React.useState(false)
  const [promoSearchCreate, setPromoSearchCreate] = React.useState("")
  const [promoSearchEdit, setPromoSearchEdit] = React.useState("")

  const [createStoreSelected, setCreateStoreSelected] = React.useState<Set<string>>(() => new Set())
  const [createPromoSelected, setCreatePromoSelected] = React.useState<Set<string>>(() => new Set())

  const [editOpen, setEditOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ProfileWithShares | null>(null)
  const [editStores, setEditStores] = React.useState<Set<string>>(() => new Set())
  const [editPromos, setEditPromos] = React.useState<Set<string>>(() => new Set())
  const [editSaving, setEditSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/users", {
        cache: "no-store",
        credentials: "same-origin",
      })
      const text = await res.text()
      let data: UsersApiPayload
      try {
        data = JSON.parse(text) as UsersApiPayload
      } catch {
        setLoadError(
          `Invalid response (${res.status}). The server may be misconfigured — check Vercel logs.`,
        )
        setMe(null)
        setUsers([])
        return
      }

      if (data.me) {
        setMe(data.me)
      } else {
        setMe(null)
      }

      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users)
        setLoadError(null)
      } else {
        setUsers(Array.isArray(data.users) ? data.users : [])
        const msg =
          data.error ??
          (res.status === 401
            ? "Please sign in again."
            : "Could not load the user list.")
        setLoadError(msg)
        if (data.me) {
          toast.message("User list unavailable", {
            description: msg.includes("SERVICE_ROLE")
              ? "Add SUPABASE_SERVICE_ROLE_KEY to your deployment to load the table. You can still add users below."
              : msg,
          })
        } else {
          toast.error(msg)
        }
      }
    } catch {
      const msg = "Network error — try again."
      setLoadError(msg)
      setMe(null)
      setUsers([])
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const loadCatalogs = React.useCallback(async () => {
    setStoresLoading(true)
    setPromoLoading(true)
    try {
      const [storesRes, promosRes] = await Promise.all([
        fetch("/api/stores", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/sales-promo/documents", { credentials: "same-origin", cache: "no-store" }),
      ])
      if (storesRes.ok) {
        const raw = await storesRes.json()
        setOrgStoreNames(parseStoreNamesFromApiPayload(raw))
      }
      if (promosRes.ok) {
        const pj = (await promosRes.json()) as {
          ok?: boolean
          documents?: { id: string; title: string }[]
        }
        if (pj.ok && Array.isArray(pj.documents)) {
          setPromoDocs(pj.documents.map((d) => ({ id: d.id, title: d.title })))
        }
      }
    } catch {
      toast.error("Could not load store or promo lists")
    } finally {
      setStoresLoading(false)
      setPromoLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (me && ["master_admin", "admin"].includes(me.role)) {
      void loadCatalogs()
    }
  }, [me, loadCatalogs])

  React.useEffect(() => {
    if (role !== "manager") {
      setCreateStoreSelected(new Set())
      setCreatePromoSelected(new Set())
    }
  }, [role])

  const creatableRoles = React.useMemo((): Array<"admin" | "manager"> => {
    if (!me) return []
    const opts: Array<"admin" | "manager"> = []
    if (canCreateRole(me.role, "admin")) opts.push("admin")
    if (canCreateRole(me.role, "manager")) opts.push("manager")
    return opts
  }, [me])

  const canInvite = creatableRoles.length > 0

  const openCreate = () => {
    setEmail("")
    setPassword(generateSecurePassword())
    setFullName("")
    const first = creatableRoles.includes("manager") ? "manager" : "admin"
    setRole(first)
    setCreateStoreSelected(new Set())
    setCreatePromoSelected(new Set())
    setStoreSearchCreate("")
    setPromoSearchCreate("")
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!me || !email.trim() || !password) {
      toast.error("Email and password are required")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (!canCreateRole(me.role, role)) {
      toast.error("You cannot create users with this role")
      return
    }
    if (role === "manager" && createStoreSelected.size === 0) {
      toast.error("Select at least one store location for a manager")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
          role,
          assigned_store_names:
            role === "manager" ? Array.from(createStoreSelected).sort((a, b) => a.localeCompare(b)) : undefined,
          shared_sales_promo_document_ids:
            role === "manager" ? Array.from(createPromoSelected) : undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error || "Create failed")
        return
      }
      toast.success("User created", {
        description:
          "They can sign in immediately — no email confirmation required. Share the password securely.",
      })
      setDialogOpen(false)
      void load()
    } catch {
      toast.error("Create failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: ProfileWithShares) => {
    if (!me) return
    if (!canDeleteUser(me, row)) return
    if (!confirm(`Remove access for ${row.email ?? row.id}?`)) return
    setDeletingId(row.id)
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error || "Delete failed")
        return
      }
      toast.success("User removed")
      void load()
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  const openEditManager = (row: ProfileWithShares) => {
    if (!me || !canConfigureManagerAccess(me, row)) return
    setEditTarget(row)
    setEditStores(new Set(row.assigned_store_names ?? []))
    setEditPromos(new Set(row.shared_sales_promo_document_ids ?? []))
    setStoreSearchEdit("")
    setPromoSearchEdit("")
    setEditOpen(true)
  }

  const saveEditManager = async () => {
    if (!me || !editTarget) return
    if (!canConfigureManagerAccess(me, editTarget)) return
    if (editStores.size === 0) {
      toast.error("Select at least one store location")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_store_names: Array.from(editStores).sort((a, b) => a.localeCompare(b)),
          shared_sales_promo_document_ids: Array.from(editPromos),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Update failed")
        return
      }
      toast.success("Manager assignments updated")
      setEditOpen(false)
      setEditTarget(null)
      void load()
    } catch {
      toast.error("Update failed")
    } finally {
      setEditSaving(false)
    }
  }

  const filteredStoresCreate = React.useMemo(() => {
    const q = storeSearchCreate.trim().toLowerCase()
    if (!q) return orgStoreNames
    return orgStoreNames.filter((n) => n.toLowerCase().includes(q))
  }, [orgStoreNames, storeSearchCreate])

  const filteredStoresEdit = React.useMemo(() => {
    const q = storeSearchEdit.trim().toLowerCase()
    if (!q) return orgStoreNames
    return orgStoreNames.filter((n) => n.toLowerCase().includes(q))
  }, [orgStoreNames, storeSearchEdit])

  const filteredPromosCreate = React.useMemo(() => {
    const q = promoSearchCreate.trim().toLowerCase()
    if (!q) return promoDocs
    return promoDocs.filter((d) => d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
  }, [promoDocs, promoSearchCreate])

  const filteredPromosEdit = React.useMemo(() => {
    const q = promoSearchEdit.trim().toLowerCase()
    if (!q) return promoDocs
    return promoDocs.filter((d) => d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
  }, [promoDocs, promoSearchEdit])

  if (loading && me === null && !loadError) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" aria-hidden />
      </div>
    )
  }

  if (!me && loadError) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6 lg:p-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Users
        </h1>
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
        >
          <p className="font-medium text-destructive">Could not verify your account</p>
          <p className="mt-2 text-muted-foreground">{loadError}</p>
          <ActionTooltip label="Reload the page to retry loading your session." side="top">
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCwIcon className="size-4" aria-hidden />
              Reload page
            </Button>
          </ActionTooltip>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Users
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Invite teammates with an <strong className="font-medium text-foreground">Admin</strong> or{" "}
            <strong className="font-medium text-foreground">Manager</strong> role. New accounts are{" "}
            <strong className="font-medium text-foreground">confirmed automatically</strong> so they can sign in
            right away. <strong className="font-medium text-foreground">Managers</strong> must be assigned one or
            more store locations and optionally Sales Promo documents; they have a read-only dashboard for those
            stores. Master admin can remove admins and managers; admins can remove managers.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ActionTooltip label="Reload the user list from the server." side="top">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} aria-hidden />
              Refresh
            </Button>
          </ActionTooltip>
          {canInvite ? (
            <ActionTooltip label="Create a confirmed Supabase user and send them a temporary password." side="top">
              <Button
                type="button"
                className="gap-2 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
                onClick={openCreate}
              >
                <PlusIcon className="size-4" aria-hidden />
                Add user
              </Button>
            </ActionTooltip>
          ) : null}
        </div>
      </div>

      {loadError && me ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-foreground"
        >
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Table could not be loaded
          </p>
          <p className="mt-1 text-muted-foreground">{loadError}</p>
          {loadError.includes("SERVICE_ROLE") || loadError.includes("service role") ? (
            <p className="mt-2 text-muted-foreground">
              Add <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              to your Vercel project environment variables and redeploy. You can still use{" "}
              <strong>Add user</strong> below if that key is set for API routes.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="min-w-[140px]">Stores</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {loadError && me
                    ? "No rows loaded. Fix the error above or add a user."
                    : canInvite
                      ? "No users yet. Click Add user to invite someone."
                      : "No users to show."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const canDel = me ? canDeleteUser(me, u) : false
                const canEditMgr = me ? canConfigureManagerAccess(me, u) : false
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          u.role === "master_admin" &&
                            "bg-[#1A1E26]/10 text-[#1A1E26]",
                          u.role === "admin" &&
                            "bg-blue-500/10 text-blue-800 dark:text-blue-300",
                          u.role === "manager" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                      {u.role === "manager" && (u.assigned_store_names?.length ?? 0) > 0 ? (
                        <span className="line-clamp-2" title={u.assigned_store_names!.join(", ")}>
                          {u.assigned_store_names!.join(", ")}
                        </span>
                      ) : u.role === "manager" ? (
                        "—"
                      ) : (
                        <span className="text-muted-foreground/70">n/a</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {canEditMgr ? (
                          <ActionTooltip label="Assign stores and Sales Promo document access." side="left">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-foreground"
                              onClick={() => openEditManager(u)}
                            >
                              <PencilIcon className="size-4" aria-hidden />
                            </Button>
                          </ActionTooltip>
                        ) : null}
                        {canDel ? (
                          <ActionTooltip label={`Remove ${u.email ?? "this user"} from the workspace (irreversible).`} side="left">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingId === u.id}
                              onClick={() => void handleDelete(u)}
                            >
                              {deletingId === u.id ? (
                                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2Icon className="size-4" aria-hidden />
                              )}
                            </Button>
                          </ActionTooltip>
                        ) : null}
                        {!canEditMgr && !canDel ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Creates a Supabase auth account with <strong>email already confirmed</strong>, so they
              can sign in immediately. Send them the temporary password through a secure channel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="new-pass">Temporary password</Label>
                <ActionTooltip label="Fill the password field with a random strong value." side="left">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 px-2 py-1 text-xs"
                    onClick={() => {
                      const p = generateSecurePassword()
                      setPassword(p)
                      toast.message("New password generated", {
                        description: "Copy it now — it won’t be shown again after you leave.",
                      })
                    }}
                  >
                    <SparklesIcon className="size-3.5" aria-hidden />
                    Generate
                  </Button>
                </ActionTooltip>
              </div>
              <Input
                id="new-pass"
                type="text"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supabase requires at least 6 characters. User can change password later if you enable
                reset in your Supabase project.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name</Label>
              <Input
                id="new-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <select
                id="new-role"
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm",
                  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "manager")
                }
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            {role === "manager" ? (
              <>
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <Label>Store locations (required)</Label>
                  <p className="text-xs text-muted-foreground">
                    Same list as the discount dashboard location filter. This manager only sees discounts that include
                    at least one of these stores.
                  </p>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9 text-sm"
                      placeholder="Search stores…"
                      value={storeSearchCreate}
                      onChange={(e) => setStoreSearchCreate(e.target.value)}
                      disabled={storesLoading}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={storesLoading}
                      onClick={() => setCreateStoreSelected(new Set(filteredStoresCreate))}
                    >
                      Select visible
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={storesLoading}
                      onClick={() => setCreateStoreSelected(new Set())}
                    >
                      Clear all
                    </Button>
                  </div>
                  <ScrollArea className="h-48 rounded-md border border-border/80 p-2">
                    {storesLoading ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">Loading stores…</p>
                    ) : filteredStoresCreate.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">No stores match</p>
                    ) : (
                      <div className="space-y-1 pr-2">
                        {filteredStoresCreate.map((name) => (
                          <label
                            key={name}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/70"
                          >
                            <Checkbox
                              checked={createStoreSelected.has(name)}
                              onCheckedChange={(v) => {
                                setCreateStoreSelected((prev) => {
                                  const next = new Set(prev)
                                  if (v === true) next.add(name)
                                  else next.delete(name)
                                  return next
                                })
                              }}
                            />
                            <span className="text-sm leading-tight">{name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Label>Sales Promo access (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Managers can open shared documents in view-only mode from Sales Promo.
                  </p>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9 text-sm"
                      placeholder="Search documents…"
                      value={promoSearchCreate}
                      onChange={(e) => setPromoSearchCreate(e.target.value)}
                      disabled={promoLoading}
                    />
                  </div>
                  <ScrollArea className="h-36 rounded-md border border-border/80 p-2">
                    {promoLoading ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">Loading documents…</p>
                    ) : filteredPromosCreate.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">No documents</p>
                    ) : (
                      <div className="space-y-1 pr-2">
                        {filteredPromosCreate.map((d) => (
                          <label
                            key={d.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/70"
                          >
                            <Checkbox
                              checked={createPromoSelected.has(d.id)}
                              onCheckedChange={(v) => {
                                setCreatePromoSelected((prev) => {
                                  const next = new Set(prev)
                                  if (v === true) next.add(d.id)
                                  else next.delete(d.id)
                                  return next
                                })
                              }}
                            />
                            <span className="text-sm leading-tight">{d.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <ActionTooltip label="Close without creating a user." side="top">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </ActionTooltip>
            <ActionTooltip label="Create the account with the email, password, and role above." side="top">
              <Button
                type="button"
                className="bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
                disabled={saving}
                onClick={() => void handleCreate()}
              >
                {saving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Create user"
                )}
              </Button>
            </ActionTooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditTarget(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit manager access</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Assign stores and optional Sales Promo shares for ${editTarget.email ?? editTarget.id}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Store locations</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9 text-sm"
                    placeholder="Search stores…"
                    value={storeSearchEdit}
                    onChange={(e) => setStoreSearchEdit(e.target.value)}
                    disabled={storesLoading}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={storesLoading}
                    onClick={() => setEditStores(new Set(filteredStoresEdit))}
                  >
                    Select visible
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={storesLoading}
                    onClick={() => setEditStores(new Set())}
                  >
                    Clear all
                  </Button>
                </div>
                <ScrollArea className="h-48 rounded-md border border-border/80 p-2">
                  {storesLoading ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">Loading stores…</p>
                  ) : filteredStoresEdit.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No stores match</p>
                  ) : (
                    <div className="space-y-1 pr-2">
                      {filteredStoresEdit.map((name) => (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/70"
                        >
                          <Checkbox
                            checked={editStores.has(name)}
                            onCheckedChange={(v) => {
                              setEditStores((prev) => {
                                const next = new Set(prev)
                                if (v === true) next.add(name)
                                else next.delete(name)
                                return next
                              })
                            }}
                          />
                          <span className="text-sm leading-tight">{name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Sales Promo access</Label>
                <p className="text-xs text-muted-foreground">Choose which promo documents this manager may open.</p>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-9 text-sm"
                    placeholder="Search documents…"
                    value={promoSearchEdit}
                    onChange={(e) => setPromoSearchEdit(e.target.value)}
                    disabled={promoLoading}
                  />
                </div>
                <ScrollArea className="h-36 rounded-md border border-border/80 p-2">
                  {promoLoading ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Loading documents…</p>
                  ) : filteredPromosEdit.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">No documents</p>
                  ) : (
                    <div className="space-y-1 pr-2">
                      {filteredPromosEdit.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/70"
                        >
                          <Checkbox
                            checked={editPromos.has(d.id)}
                            onCheckedChange={(v) => {
                              setEditPromos((prev) => {
                                const next = new Set(prev)
                                if (v === true) next.add(d.id)
                                else next.delete(d.id)
                                return next
                              })
                            }}
                          />
                          <span className="text-sm leading-tight">{d.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
              disabled={editSaving || !editTarget}
              onClick={() => void saveEditManager()}
            >
              {editSaving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
