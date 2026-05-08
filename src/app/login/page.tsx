"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileStackIcon, LayoutGridIcon, Loader2Icon, LogInIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const PANEL_MAX = "mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8"

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
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-to-br from-primary/[0.07] via-background to-background">
      <div
        className={cn(
          "flex flex-1 flex-col justify-center py-10 md:py-14 lg:py-16",
          PANEL_MAX,
        )}
      >
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          {/* Left: brand + info */}
          <div className="flex min-h-0 flex-col justify-center space-y-8 border-primary/10 lg:border-r lg:pr-10 xl:pr-14">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.07] px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
                <LayoutGridIcon className="size-3.5" aria-hidden />
                Perfect Union
              </div>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0 rounded-2xl border border-primary/12 bg-card p-4 shadow-sm ring-1 ring-primary/[0.06]">
                  <Image
                    src="/logo.webp"
                    alt="Perfect Union"
                    width={64}
                    height={64}
                    className="size-14 object-contain md:size-16"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    Discount portal
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground md:text-base">
                    Sign in with your work email to manage discounts and drafts.
                  </p>
                </div>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                Access bulk uploads, saved drafts, publishing to Treez, and your discount catalog from one
                secure workspace.
              </p>
            </div>

            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-1">
              <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                <UploadIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Bulk create</span> — upload many discounts
                  in a single grid.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                <FileStackIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Drafts &amp; schedule</span> — save work,
                  publish when ready, or auto-publish by date.
                </span>
              </li>
            </ul>
          </div>

          {/* Right: form */}
          <div className="flex w-full min-w-0 flex-col justify-center lg:pl-2">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-md sm:p-8 md:p-9">
              <div className="mb-6 space-y-1">
                <h2 className="font-heading text-xl font-semibold text-foreground">Sign in</h2>
                <p className="text-sm text-muted-foreground">Use the credentials your admin provided.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-11"
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11"
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" disabled={loading} className="mt-1 h-12 w-full gap-2">
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

                <p className="text-center text-xs text-muted-foreground">
                  Need access? Ask your administrator to create an account.
                </p>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link href="/" className="underline-offset-2 hover:text-foreground hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
