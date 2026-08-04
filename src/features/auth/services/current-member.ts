import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the signed-in Supabase user to their Member record.
 * Cached per-request so repeated calls in a render tree don't refetch.
 */
export const getCurrentMember = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // organization/company relations were included here but never read by any
  // caller (verified repo-wide) — this function runs on nearly every
  // request in the app, so dropping the two unused joins matters everywhere
  // at once. Keep commissionTier: settings/page.tsx reads .code/.percentage.
  // subscription is a deliberate exception to that rule: premium-feature
  // gating (membership-gate.ts) needs it on every gated page/action, so
  // it's genuinely broadly read rather than speculative.
  const member = await prisma.member.findUnique({
    where: { authUserId: user.id },
    include: { commissionTier: true, subscription: true },
  });

  // Email changes go through Supabase's own confirmation flow (see
  // changeEmail() in settings/services/actions.ts) — Member.email is never
  // written directly. Once Supabase confirms the change, this is where the
  // denormalized copy catches up, on the next request that resolves the
  // current member.
  if (member && user.email && member.email !== user.email) {
    return prisma.member.update({
      where: { id: member.id },
      data: { email: user.email },
      include: { commissionTier: true, subscription: true },
    });
  }

  return member;
});

export const requireCurrentMember = cache(async () => {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error("Not authenticated");
  }
  return member;
});
