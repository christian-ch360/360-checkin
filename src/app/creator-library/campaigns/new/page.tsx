import { cookies } from "next/headers";
import { LIBRARY_COOKIE_NAME, isLibraryAccessConfigured, verifyLibraryToken } from "@/features/creator-library/auth/session";
import { getPrimaryOrganizationId, listLibraryCategories } from "@/features/creator-library/services/creator-library.service";
import { LibraryPasswordGate } from "@/features/creator-library/components/library-password-gate";
import { LibraryTopBar } from "@/features/creator-library/components/library-top-bar";
import { CampaignBuilder } from "@/features/creator-library/components/campaign-builder/campaign-builder";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const cookieStore = await cookies();
  const authed = await verifyLibraryToken(cookieStore.get(LIBRARY_COOKIE_NAME)?.value);
  if (!authed) {
    return <LibraryPasswordGate redirectTo="/creator-library/campaigns/new" configured={isLibraryAccessConfigured()} />;
  }

  const organizationId = await getPrimaryOrganizationId();
  const categories = organizationId ? await listLibraryCategories(organizationId) : [];

  return (
    <>
      <LibraryTopBar activeView="campaigns" />
      <main className="bg-[#FAF9F6]">
        <div className="border-b border-[#EAE1CB] bg-white">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
            <p className="text-[0.7rem] font-medium tracking-[0.3em] text-[#B8935A] uppercase">Request a Campaign</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">Build your campaign</h1>
            <p className="mt-2 max-w-lg text-[#6B6B6B]">
              Tell us about your brand and goals — we&rsquo;ll match you with the right creators from the CreatorHub360 network.
            </p>
          </div>
        </div>
        <CampaignBuilder categories={categories} />
      </main>
    </>
  );
}
