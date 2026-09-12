import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LIBRARY_COOKIE_NAME,
  verifyLibraryToken,
} from "@/features/creator-library/auth/session";
import {
  getLibraryCreator,
  getPrimaryOrganizationId,
} from "@/features/creator-library/services/creator-library.service";
import { getLibrarySettings } from "@/features/creator-library/lib/library-settings";
import { LibraryTopBar } from "@/features/creator-library/components/library-top-bar";
import {
  CreatorProfile,
  CreatorProfileMissing,
} from "@/features/creator-library/components/creator-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Creator" };

export default async function CreatorLibraryProfilePage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;

  // Middleware already gates this route; this is a cheap defense-in-depth
  // check so the page never renders creator data without a valid session.
  const cookieStore = await cookies();
  if (!(await verifyLibraryToken(cookieStore.get(LIBRARY_COOKIE_NAME)?.value))) {
    redirect(`/creator-library?redirectTo=${encodeURIComponent(`/creator-library/${creatorId}`)}`);
  }

  const organizationId = await getPrimaryOrganizationId();
  const [creator, settings] = await Promise.all([
    organizationId ? getLibraryCreator(organizationId, creatorId) : Promise.resolve(null),
    organizationId ? getLibrarySettings(organizationId) : Promise.resolve(null),
  ]);

  return (
    <>
      <LibraryTopBar activeView={null} />
      {creator ? (
        <CreatorProfile creator={creator} placeholderIconUrl={settings?.placeholderIconUrl} />
      ) : (
        <CreatorProfileMissing />
      )}
    </>
  );
}
