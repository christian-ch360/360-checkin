import { NextResponse, type NextRequest } from "next/server";
import { LIBRARY_COOKIE_NAME, verifyLibraryToken } from "@/features/creator-library/auth/session";

/**
 * Edge middleware gate for the entire /creator-library route tree (spec §27:
 * "Protect all Creator Library routes / Protect creator profile routes").
 *
 * `/creator-library` itself always renders — unauthenticated it shows the
 * password screen, authenticated it shows the library home (the page decides
 * from the same cookie). Everything deeper (`/creator-library/<id>`, any
 * future sub-route) requires a valid session cookie or is bounced to the
 * password screen with a `redirectTo` so the visitor lands where they meant
 * to after entering the password.
 */
export async function guardCreatorLibrary(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // The gate page and the server-action POSTs that target it must always pass.
  if (pathname === "/creator-library") {
    return NextResponse.next({ request });
  }

  const token = request.cookies.get(LIBRARY_COOKIE_NAME)?.value;
  if (await verifyLibraryToken(token)) {
    return NextResponse.next({ request });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/creator-library";
  url.search = "";
  url.searchParams.set("redirectTo", `${pathname}${search}`);
  return NextResponse.redirect(url);
}
