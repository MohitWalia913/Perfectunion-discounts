"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, LogInIcon } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Enter email and password")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        toast.error("Sign in failed", { description: error.message })
        return
      }
      router.refresh()
      window.location.href = "/dashboard"
    } catch (err) {
      toast.error("Something went wrong", {
        description: (err as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1A1E26] via-[#1A1E26] to-[#12151c]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-pulse rounded-full bg-[#2a3548] opacity-20 blur-3xl" />
        <div className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-pulse rounded-full bg-[#2a3548] opacity-20 blur-3xl [animation-delay:1s]" />
      </div>

      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/20 blur-xl" />
            <div className="relative rounded-full border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
              <Image
                src="/logo.webp"
                alt="Perfect Union"
                width={56}
                height={56}
                className="size-14 object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
            Perfect Union Portal
          </h1>
          <p className="text-sm text-white/70">Sign in with your work email</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 border-white/30 bg-white/20 text-white placeholder:text-white/40"
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 border-white/30 bg-white/20 text-white placeholder:text-white/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full gap-2 bg-white/90 text-[#1A1E26] hover:bg-white"
          >
            {loading ? (
              <>
                <Loader2Icon className="size-5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogInIcon className="size-5" />
                Sign in
              </>
            )}
          </Button>

          <p className="mt-4 text-center text-xs text-white/50">
            Need access? Ask your administrator to create an account.
          </p>
        </form>

        <p className="mt-8 text-center text-xs text-white/40">
          <Link href="/" className="underline-offset-2 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
