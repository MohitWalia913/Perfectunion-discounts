import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getPublicSupabaseConfig } from "@/lib/supabase/keys"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { url, key } = getPublicSupabaseConfig()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isApi = pathname.startsWith("/api")
  const isLogin = pathname === "/login"

  if (
    user &&
    !isApi &&
    pathname !== "/login" &&
    (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
  ) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if ((prof?.role as string | undefined) === "manager") {
      const blockedPrefixes = [
        "/dashboard/discounts/bulk-upload",
        "/dashboard/discounts/drafts",
        "/dashboard/discounts/edit-drafts",
        "/dashboard/discounts/create",
        "/dashboard/users",
      ]
      const hit = blockedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
      if (hit) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!user && !isApi && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return supabaseResponse
}
