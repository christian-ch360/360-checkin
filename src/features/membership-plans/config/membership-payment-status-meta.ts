import type { MembershipPaymentStatus } from "@prisma/client";
import type { statusToneClass } from "@/lib/utils/status-colors";

export const MEMBERSHIP_PAYMENT_STATUS_META: Record<MembershipPaymentStatus, { label: string; tone: keyof typeof statusToneClass }> = {
  PENDING: { label: "Pending", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "error" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  CANCELED: { label: "Canceled", tone: "neutral" },
};
