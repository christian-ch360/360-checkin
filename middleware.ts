import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/features/referrals/config/referral-cookie";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // "Persist referral through navigation ... reasonable expiration (~30
  // days)" — first-party cookie set the moment anyone lands on /apply with a
  // referral code, so it survives if they browse the rest of the form before
  // submitting. `ref` is the general param; `agency` stays as an alias for
  // existing Agency ID links/QR codes already printed and in circulation.
  if (request.nextUrl.pathname === "/apply") {
    const code = request.nextUrl.searchParams.get("ref")?.trim() || request.nextUrl.searchParams.get("agency")?.trim();
    if (code) {
      response.cookies.set(REFERRAL_COOKIE_NAME, code.toUpperCase(), {
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
