import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      )
    }

    const appPassword = process.env.APP_PASSWORD
    
    if (!appPassword) {
      console.error("APP_PASSWORD is not configured in environment variables")
      return NextResponse.json(
        { success: false, error: "Authentication not configured" },
        { status: 500 }
      )
    }

    // Verify the password
    if (password === appPassword) {
      // Set authentication cookie (expires in 30 days)
      const cookieStore = await cookies()
      cookieStore.set("app_authenticated", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      )
    }
  } catch (e) {
    console.error("Auth verification error:", e)
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    )
  }
}
