import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/apply",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/scan",
  "/kiosk",
  "/project-invite",
  "/legal",
];
// /reset-password must stay public even though it's session-driven: Supabase's
// default recovery email delivers the session via a URL hash fragment, which
// never reaches the server. If middleware gated this route on an existing
// session cookie, it would redirect the request to /login before the page's
// client JS ever got a chance to read the fragment and establish one.
// The kiosk itself (home, scan, visitor registration) is public and unauthenticated,
// but its admin panel is staff-only and must not inherit that.
const PUBLIC_PATH_EXCEPTIONS = ["/kiosk/admin"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATH_EXCEPTIONS.some((path) => pathname.startsWith(path))) return false;
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/apply")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
