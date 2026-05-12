import { deleteServiceDiscountOrFallback, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"
import { rejectIfManager } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/profile"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = rejectIfManager(await getCurrentProfile())
  if (denied) return denied

  try {
    const { id } = await params
    
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: "Invalid discount ID", details: { errorMsgs: ["Discount ID is required"] } },
        { status: 400 }
      )
    }
    
    console.log("DELETE /api/discounts/[id] - Attempting to delete discount:", id)
    
    const env = getTreezEnv()
    
    const { outcome, body } = await deleteServiceDiscountOrFallback(env, id)
    console.log("DELETE /api/discounts/[id] - Success:", outcome, body)

    if (outcome === "deactivated") {
      return NextResponse.json({
        ...(typeof body === "object" && body !== null ? body : {}),
        _note: "Discount was deactivated (not deleted) due to API limitations",
      })
    }

    return NextResponse.json(body ?? {})
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown }
    
    console.error("DELETE /api/discounts/[id] - Error:", {
      message: err.message,
      status: err.status,
      body: err.body
    })
    
    return NextResponse.json(
      { 
        error: err.message, 
        details: err.body,
        suggestion: "Your API certificate may not have DELETE permissions. Contact Treez support to enable deletion, or use the deactivate feature instead."
      },
      { status: err.status || 500 }
    )
  }
}
