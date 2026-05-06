"use client"

import * as React from "react"
import { canCreateRole, canDeleteUser } from "@/lib/auth/permissions"
import type { AppRole, ProfileRow } from "@/lib/auth/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
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

export function UsersManagement() {
  const [users, setUsers] = React.useState<ProfileRow[]>([])
  const [me, setMe] = React.useState<ProfileRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [role, setRole] = React.useState<AppRole>("manager")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users", { cache: "no-store" })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error || "Failed to load users")
        return
      }
      setMe(data.me)
      setUsers(data.users)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const creatableRoles = React.useMemo((): AppRole[] => {
    if (!me) return []
    const opts: AppRole[] = []
    const tryAdd = (r: AppRole) => {
      if (canCreateRole(me.role, r)) opts.push(r)
    }
    tryAdd("admin")
    tryAdd("manager")
    return opts
  }, [me])

  const openCreate = () => {
    setEmail("")
    setPassword("")
    setFullName("")
    setRole(creatableRoles.includes("manager") ? "manager" : "admin")
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!me || !email.trim() || !password) {
      toast.error("Email and password are required")
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
      toast.success("User created")
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
      const res = await fetch(`/api/users/${row.id}`, { method: "DELETE" })
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

  if (loading && !me) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" aria-hidden />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Users
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage portal accounts. Managers can view only; admins can remove managers;
            master admin manages admins and managers.
          </p>
        </div>
        {creatableRoles.length > 0 ? (
          <Button
            type="button"
            className="gap-2 bg-[#1A1E26] text-white hover:bg-[#1A1E26]/90"
            onClick={openCreate}
          >
            <PlusIcon className="size-4" aria-hidden />
            Add user
          </Button>
        ) : null}
      </div>

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
            {users.map((u) => {
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
                        u.role === "admin" && "bg-blue-500/10 text-blue-800 dark:text-blue-300",
                        u.role === "manager" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {roleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {canDel ? (
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
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
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
              <Label htmlFor="new-pass">Temporary password</Label>
              <Input
                id="new-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name (optional)</Label>
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
                onChange={(e) => setRole(e.target.value as AppRole)}
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
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
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
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
