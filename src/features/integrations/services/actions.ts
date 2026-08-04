"use server";

import { revalidatePath } from "next/cache";
import type { SocialPlatform } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { disconnectConnection, syncConnection } from "@/features/integrations/services/social-connections.service";

export type IntegrationActionResult = { success: true } | { success: false; error: string };

export async function disconnectPlatform(platform: SocialPlatform): Promise<IntegrationActionResult> {
  const actor = await requireCurrentMember();
  await disconnectConnection(actor.id, platform);
  revalidatePath("/profile");
  return { success: true };
}

export async function resyncPlatform(platform: SocialPlatform): Promise<IntegrationActionResult> {
  const actor = await requireCurrentMember();
  try {
    await syncConnection(actor.id, platform);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
  revalidatePath("/profile");
  return { success: true };
}
