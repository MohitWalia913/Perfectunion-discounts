"use client"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={0}>
      {children}
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  )
}
