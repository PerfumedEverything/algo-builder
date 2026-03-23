import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password")
  const isApiWebhook =
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/api/signals")
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon")
  const isServerAction = request.method === "POST" && request.headers.get("next-action")

  if (isApiWebhook || isPublicAsset) {
    return supabaseResponse
  }

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  if (user && !isAuthPage && !isServerAction) {
    try {
      const { data: dbUser } = await supabase
        .from("User")
        .select("blocked, role")
        .eq("supabaseId", user.id)
        .single()

      if (dbUser?.blocked) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
      }

      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
      if (isAdminRoute && dbUser?.role !== "ADMIN") {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
    } catch {
      // ignore — don't block navigation on DB errors
    }
  }

  return supabaseResponse
}
