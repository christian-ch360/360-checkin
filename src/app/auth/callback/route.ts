import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

// Standard Supabase SSR email-link landing point. Supabase emails one of two
// link shapes depending on project/template config, and this handles both:
//   - PKCE: `?code=...` — exchangeCodeForSession. Requires the *same browser*
//     that originated the request (it stores a local code verifier), so this
//     only works for flows a user's own browser actually initiated. Google/
//     Apple OAuth redirects land here too, via the same PKCE code shape.
//   - OTP hash: `?token_hash=...&type=...` — verifyOtp. Self-contained, no
//     prior browser state needed, so this is what works for links issued by
//     e.g. an admin/server-side script rather than the user's own browser.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = sanitizeRedirectPath(searchParams.get("next")) ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const provisioned = await provisionOAuthMember(supabase);
      if (!provisioned.ok) {
        await supabase.auth.signOut();
        // Google/Apple only hand us the account's name on this one grant —
        // prefill /apply with it (and the email) rather than losing it,
        // since the user still has to apply for access from here.
        const params = new URLSearchParams({ message: "No account found for that sign-in. Apply for access below." });
        if (provisioned.fullName) params.set("fullName", provisioned.fullName);
        if (provisioned.email) params.set("email", provisioned.email);
        return NextResponse.redirect(`${origin}/apply?${params.toString()}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Surface the real Supabase error (denied consent, provider outage,
    // etc.) instead of the generic "expired link" message below, which is
    // only accurate for the OTP path.
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(error.message)}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as "recovery", token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Sign-in link is invalid or expired`);
}

type ProvisionResult = { ok: true } | { ok: false; fullName?: string; email?: string };

/**
 * Every existing sign-up path (invite-and-password, /apply approval) already
 * creates a Member row with authUserId set before this route is ever hit. A
 * Google/Apple sign-in is the one path that can land here with a brand-new
 * Supabase user that has no matching Member yet — this links it to an
 * existing Member by email (so someone invited via email/password can also
 * use Google), or reports "not provisioned" (with whatever name/email the
 * provider gave us, for the caller to prefill /apply with) so the caller can
 * bounce them there instead of leaving them signed in with no account.
 */
async function provisionOAuthMember(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ProvisionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const existingByAuthId = await prisma.member.findUnique({ where: { authUserId: user.id } });
  if (existingByAuthId) return { ok: true };

  const notProvisioned: ProvisionResult = {
    ok: false,
    fullName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
    email: user.email,
  };

  if (!user.email) return notProvisioned;
  const existingByEmail = await prisma.member.findUnique({ where: { email: user.email } });
  if (!existingByEmail) return notProvisioned;

  await prisma.member.update({ where: { id: existingByEmail.id }, data: { authUserId: user.id } });
  return { ok: true };
}
