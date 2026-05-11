"use client"

import * as React from "react"
import { canCreateRole, canDeleteUser } from "@/lib/auth/permissions"
import type { AppRole, ProfileRow } from "@/lib/auth/types"
import { Button } from "@/components/ui/button"
import { ActionTooltip } from "@/components/action-tooltip"
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
  PlusIcon,
  RefreshCwIcon,
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
  users?: ProfileRow[]
}

export function UsersManagement() {
  const [users, setUsers] = React.useState<ProfileRow[]>([])
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

  const handleDelete = async (row: ProfileRow) => {
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
            <strong className="font-medium text-foreground">confirmed automatically</strong> so they can
            sign in right away. Managers can only view this list; admins can remove managers; master
            admin can manage admins and managers.
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
          ) : me?.role === "manager" ? (
            <span className="text-xs text-muted-foreground">View only</span>
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
              <TableHead>Created</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
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
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
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
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
    </div>
  )
}
