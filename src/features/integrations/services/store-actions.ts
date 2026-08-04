"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { StoreProvider } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { normalizeShopDomain } from "@/features/integrations/config/store-providers";
import { buildStoreAuthorizeUrl, disconnectStoreConnection, syncStoreConnection } from "@/features/integrations/services/store-connections.service";

export type StoreActionResult = { success: true } | { success: false; error: string };

/** Validates the shop domain, builds the Shopify authorize URL, and redirects — the one non-single-click connect step in this app. */
export async function connectStore(provider: StoreProvider, rawShopDomain: string): Promise<StoreActionResult> {
  const actor = await requireCurrentMember();

  const shopDomain = normalizeShopDomain(rawShopDomain);
  if (!shopDomain) return { success: false, error: "Enter a valid store domain, e.g. yourstore.myshopify.com" };

  const url = buildStoreAuthorizeUrl(provider, actor.id, shopDomain);
  if (!url) return { success: false, error: `${provider} isn't configured yet` };

  redirect(url);
}

export async function disconnectStore(provider: StoreProvider): Promise<StoreActionResult> {
  const actor = await requireCurrentMember();
  await disconnectStoreConnection(actor.id, provider);
  revalidatePath("/profile");
  return { success: true };
}

export async function resyncStore(provider: StoreProvider): Promise<StoreActionResult> {
  const actor = await requireCurrentMember();
  try {
    await syncStoreConnection(actor.id, provider);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
  revalidatePath("/profile");
  return { success: true };
}
