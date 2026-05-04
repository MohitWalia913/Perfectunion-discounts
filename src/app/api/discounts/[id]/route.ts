import { deleteServiceDiscount, deactivateServiceDiscount, getTreezEnv } from "@/lib/treez"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    // Try DELETE first
    try {
      const result = await deleteServiceDiscount(env, id)
      console.log("DELETE /api/discounts/[id] - Delete success:", result)
      return NextResponse.json(result)
    } catch (deleteError: any) {
      // If DELETE fails with 403 (likely AWS Sig V4 auth issue), try deactivating instead
      if (deleteError.status === 403) {
        console.log("DELETE /api/discounts/[id] - DELETE not supported, trying PATCH to deactivate")
        
        try {
          const deactivateResult = await deactivateServiceDiscount(env, id)
          console.log("DELETE /api/discounts/[id] - Deactivate success:", deactivateResult)
          return NextResponse.json({
            ...(typeof deactivateResult === 'object' && deactivateResult !== null ? deactivateResult : {}),
            _note: "Discount was deactivated (not deleted) due to API limitations"
          })
        } catch (deactivateError: any) {
          console.error("DELETE /api/discounts/[id] - Both DELETE and PATCH failed")
          throw deactivateError
        }
      }
      throw deleteError
    }
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
