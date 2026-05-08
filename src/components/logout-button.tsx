"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function useLogout() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const handleLogout = React.useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (res.ok) {
        toast.success("Logged out successfully")
        router.push("/login")
        router.refresh()
      } else {
        toast.error("Logout failed")
      }
    } catch (e) {
      toast.error("Logout failed")
    } finally {
      setLoading(false)
    }
  }, [router])

  return { loading, handleLogout }
}

export function LogoutButton() {
  const { loading, handleLogout } = useLogout()

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant="ghost"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <LogOutIcon className="size-4" />
      )}
      Logout
    </Button>
  )
}

export function LogoutSidebarMenuItem({ className }: { className?: string }) {
  const { loading, handleLogout } = useLogout()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleLogout}
        disabled={loading}
        tooltip="Log out"
        className={cn(
          "mt-0.5 border border-transparent text-sidebar-foreground/90 hover:border-destructive/15 hover:bg-destructive/10 hover:text-destructive [&_svg]:text-destructive/70 hover:[&_svg]:text-destructive",
          className,
        )}
      >
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <LogOutIcon className="size-4" />
        )}
        <span>Logout</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
