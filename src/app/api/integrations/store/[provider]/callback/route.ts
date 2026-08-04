import { NextResponse, type NextRequest } from "next/server";
import type { StoreProvider } from "@prisma/client";
import { verifyOAuthState } from "@/features/integrations/services/oauth-state";
import { STORE_PROVIDERS } from "@/features/integrations/config/store-providers";
import { exchangeAndStoreStoreConnection } from "@/features/integrations/services/store-connections.service";

const VALID_PROVIDERS: StoreProvider[] = ["SHOPIFY"];

// State (not the session cookie) is the source of truth for which member
// this callback belongs to — same reasoning as the social callback route.
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { origin, searchParams } = request.nextUrl;
  const { provider: rawProvider } = await params;
  const provider = rawProvider.toUpperCase() as StoreProvider;

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=unknown_platform`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=${encodeURIComponent(oauthError)}&platform=${provider}`);
  }
  if (!code || !state || !shop) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=missing_code&platform=${provider}`);
  }

  const parsedState = verifyOAuthState(state);
  if (!parsedState || parsedState.platform !== provider) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=invalid_state&platform=${provider}`);
  }

  // Shopify's own request signature — proves this callback actually came
  // from Shopify, separate from our own `state` proving it came from a
  // session we started.
  const config = STORE_PROVIDERS[provider];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientSecret || !config.verifyCallbackHmac(searchParams, clientSecret)) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=invalid_hmac&platform=${provider}`);
  }

  try {
    await exchangeAndStoreStoreConnection(provider, parsedState.memberId, shop, code);
  } catch (err) {
    console.error(`[integrations] ${provider} store callback failed:`, err);
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=connect_failed&platform=${provider}`);
  }

  return NextResponse.redirect(`${origin}/profile?tab=integrations&connected=${provider}`);
}
