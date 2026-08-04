import { NextResponse, type NextRequest } from "next/server";
import type { SocialPlatform } from "@prisma/client";
import { verifyOAuthState } from "@/features/integrations/services/oauth-state";
import { exchangeAndStoreConnection } from "@/features/integrations/services/social-connections.service";
import { IntegrationError } from "@/features/integrations/services/errors";

// State (not the session cookie) is the source of truth for which member
// this callback belongs to — see oauth-state.ts's doc comment for why that's
// safer across a third-party redirect than relying on requireCurrentMember().
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { origin, searchParams } = request.nextUrl;
  const { platform: rawPlatform } = await params;
  const platform = rawPlatform.toUpperCase() as SocialPlatform;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=${encodeURIComponent(oauthError)}&platform=${platform}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=missing_code&platform=${platform}`);
  }

  const parsedState = verifyOAuthState(state);
  if (!parsedState || parsedState.platform !== platform) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=invalid_state&platform=${platform}`);
  }

  try {
    await exchangeAndStoreConnection(platform, parsedState.memberId, code);
  } catch (err) {
    console.error(`[integrations] ${platform} callback failed:`, err);
    const errorCode = err instanceof IntegrationError ? err.code : "connect_failed";
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=${errorCode}&platform=${platform}`);
  }

  return NextResponse.redirect(`${origin}/profile?tab=integrations&connected=${platform}`);
}
