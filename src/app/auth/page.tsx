"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LockIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AuthPage() {
  const router = useRouter()
  const [code, setCode] = React.useState(["", "", "", "", "", ""])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  React.useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Only take last character
    setCode(newCode)
    setError(false)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join("")
      if (fullCode.length === 6) {
        handleSubmit(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split("")
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = async (fullCode?: string) => {
    const codeToSubmit = fullCode || code.join("")
    
    if (codeToSubmit.length !== 6) {
      setError(true)
      toast.error("Please enter all 6 digits")
      return
    }

    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: codeToSubmit }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Redirect immediately without delay
        window.location.href = "/dashboard"
      } else {
        setError(true)
        setCode(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
        toast.error("Invalid password", {
          description: "Please check your 6-digit code and try again",
        })
      }
    } catch (e) {
      setError(true)
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
      toast.error("Authentication failed", {
        description: "Please try again",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0C3D22] via-[#0C3D22] to-[#0a2f1a] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#0f5030] rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#0f5030] rounded-full blur-3xl opacity-20 animate-pulse [animation-delay:1s]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl" />
            <div className="relative bg-white/10 backdrop-blur-sm p-6 rounded-full border border-white/20 shadow-2xl">
              <ShieldCheckIcon className="size-12 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Perfect Union Portal
          </h1>
          <p className="text-white/70 text-sm">
            Enter your 6-digit access code to continue
          </p>
        </div>

        {/* Password input card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-center gap-1 mb-2">
            <LockIcon className="size-4 text-white/70" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              Secure Access
            </span>
          </div>

          {/* Code inputs */}
          <div className="flex gap-3 justify-center mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading}
                className={cn(
                  "w-12 h-14 text-center text-2xl font-bold rounded-lg transition-all duration-200",
                  "bg-white/20 backdrop-blur-sm border-2 text-white placeholder-white/30",
                  "focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:scale-105",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error
                    ? "border-red-400 bg-red-500/20 animate-shake"
                    : digit
                      ? "border-white/50 bg-white/30"
                      : "border-white/30 hover:border-white/40"
                )}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Submit button */}
          <button
            onClick={() => handleSubmit()}
            disabled={loading || code.join("").length !== 6}
            className={cn(
              "w-full h-12 rounded-lg font-semibold text-white transition-all duration-200",
              "bg-white/20 backdrop-blur-sm border border-white/30",
              "hover:bg-white/30 hover:border-white/40 hover:scale-[1.02]",
              "focus:outline-none focus:ring-2 focus:ring-white/50",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              "shadow-lg"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2Icon className="size-5 animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShieldCheckIcon className="size-5" />
                Verify Access
              </span>
            )}
          </button>

          {/* Helper text */}
          <p className="text-center text-xs text-white/50 mt-4">
            Your session will remain active until you clear cookies
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-8">
          Protected by Perfect Union Security
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  )
}
