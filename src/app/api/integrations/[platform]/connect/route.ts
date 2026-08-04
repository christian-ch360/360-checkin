import { NextResponse, type NextRequest } from "next/server";
import type { SocialPlatform } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { buildAuthorizeUrl } from "@/features/integrations/services/social-connections.service";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { origin } = request.nextUrl;
  const { platform: rawPlatform } = await params;
  const platform = rawPlatform.toUpperCase() as SocialPlatform;

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=unknown_platform`);
  }

  let actor;
  try {
    actor = await requireCurrentMember();
  } catch {
    return NextResponse.redirect(`${origin}/login?redirectTo=${encodeURIComponent(request.nextUrl.pathname)}`);
  }

  const url = buildAuthorizeUrl(platform, actor.id);
  if (!url) {
    return NextResponse.redirect(`${origin}/profile?tab=integrations&error=not_configured&platform=${platform}`);
  }

  return NextResponse.redirect(url);
}
