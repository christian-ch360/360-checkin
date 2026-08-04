import { FileText } from "lucide-react";
import { NotificationBanner } from "@/components/layout/notification-banner";

/** Not dismissible by design — this banner gates continued use until the
 * member accepts the updated document(s); dismissing it would defeat that. */
export function LegalReacceptanceBanner() {
  return (
    <NotificationBanner
      icon={<FileText className="size-4.5" />}
      message="Legal documents have been updated. Please review and accept the latest Terms before continuing."
      ctaLabel="Review Now"
      ctaHref="/legal/reaccept"
    />
  );
}
