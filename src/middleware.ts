import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("app_authenticated")
  const pathname = request.nextUrl.pathname

  // Allow access to the auth API route
  if (pathname === "/api/auth/verify") {
    return NextResponse.next()
  }

  // If not authenticated and not on auth page, redirect to auth
  if (!authCookie && pathname !== "/auth") {
    return NextResponse.redirect(new URL("/auth", request.url))
  }

  // If authenticated and on auth page, redirect to dashboard
  if (authCookie && pathname === "/auth") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
