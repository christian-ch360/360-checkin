import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { LIBRARY_COOKIE_NAME, isLibraryAccessConfigured, verifyLibraryToken } from "@/features/creator-library/auth/session";
import { getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { listPublishedCampaignShowcases } from "@/features/creator-library/services/campaign-showcase.service";
import { LibraryPasswordGate } from "@/features/creator-library/components/library-password-gate";
import { LibraryTopBar } from "@/features/creator-library/components/library-top-bar";
import { CampaignShowcaseCarousel } from "@/features/creator-library/components/campaign-showcase-carousel";
import { CampaignCta } from "@/features/creator-library/components/campaign-cta";

export const dynamic = "force-dynamic";

/**
 * "Our Work" — a public showcase of past CreatorHub360 campaigns. This is
 * NOT a "your campaigns" dashboard: it never reads CampaignRequest (the
 * private brand-intake model) and shows nothing tied to the current
 * visitor. See campaign-showcase.service.ts for the read path and
 * prisma/schema.prisma's CampaignShowcase model for why it's a separate
 * model from CampaignRequest.
 */
export default async function CampaignsShowcasePage() {
  const cookieStore = await cookies();
  const authed = await verifyLibraryToken(cookieStore.get(LIBRARY_COOKIE_NAME)?.value);
  if (!authed) {
    return <LibraryPasswordGate redirectTo="/creator-library/campaigns" configured={isLibraryAccessConfigured()} />;
  }

  const organizationId = await getPrimaryOrganizationId();
  const showcases = organizationId ? await listPublishedCampaignShowcases(organizationId) : [];

  return (
    <>
      <LibraryTopBar activeView="campaigns" />
      <main className="bg-[#FAF9F6]">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-20">
          <p className="text-[0.7rem] font-medium tracking-[0.3em] text-[#B8935A] uppercase">Our Work</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-[#161616] sm:text-5xl">
            Campaigns we&rsquo;ve brought to life.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#6B6B6B]">
            A look at previous CreatorHub360 campaigns — the brands, creators, and networks behind them.
          </p>

          <div className="mt-12">
            {showcases.length > 0 ? (
              <CampaignShowcaseCarousel showcases={showcases} />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#EAE1CB] bg-white px-6 py-20 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#E8D5A3] bg-[#F5F1E8]">
                  <Sparkles className="size-5 text-[#B8935A]" aria-hidden />
                </span>
                <p className="mt-4 text-sm font-medium text-[#161616]">Case studies coming soon</p>
                <p className="mt-1 text-sm text-[#6B6B6B]">We&rsquo;re curating our campaign portfolio for this page.</p>
              </div>
            )}
          </div>

          <div className="mt-16 flex flex-col items-center gap-4 border-t border-[#EAE1CB] pt-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-[#161616]">Have a campaign in mind?</h2>
            <p className="max-w-md text-[#6B6B6B]">Tell us about your brand and goals — our team will follow up directly.</p>
            <div className="mt-2">
              <CampaignCta />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
