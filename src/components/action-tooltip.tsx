"use client"

import * as React from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type Side = "top" | "bottom" | "left" | "right"

/** Hover hint for controls; Base UI may flip side to avoid viewport collisions. */
export function ActionTooltip({
  label,
  side = "top",
  children,
}: {
  label: string
  side?: Side
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} align="center" sideOffset={6} className="max-w-xs text-left">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
