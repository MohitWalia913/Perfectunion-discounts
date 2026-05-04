"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const handleLogout = async () => {
    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (res.ok) {
        toast.success("Logged out successfully")
        router.push("/auth")
        router.refresh()
      } else {
        toast.error("Logout failed")
      }
    } catch (e) {
      toast.error("Logout failed")
    } finally {
      setLoading(false)
    }
  }

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
