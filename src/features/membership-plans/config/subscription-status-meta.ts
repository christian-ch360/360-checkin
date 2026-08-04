import type { SubscriptionStatus } from "@prisma/client";
import type { statusToneClass } from "@/lib/utils/status-colors";

export const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, { label: string; tone: keyof typeof statusToneClass }> = {
  TRIALING: { label: "Trialing", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  PAST_DUE: { label: "Past due", tone: "warning" },
  CANCELED: { label: "Canceled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "error" },
};
