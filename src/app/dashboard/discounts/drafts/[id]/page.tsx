"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { BulkDiscountBuilder } from "@/components/bulk-discount-builder"

export default function EditDraftPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""

  if (!id) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Missing draft id.
      </div>
    )
  }

  return <BulkDiscountBuilder key={id} mode="draft" draftId={id} />
}
