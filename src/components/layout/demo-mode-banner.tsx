import { FlaskConical } from "lucide-react";
import { NotificationBanner } from "@/components/layout/notification-banner";

/** Dismissible for the session — purely informational, doesn't gate anything
 * (unlike LegalReacceptanceBanner), so hiding it on request is safe. */
export function DemoModeBanner() {
  return (
    <NotificationBanner
      icon={<FlaskConical className="size-4.5" />}
      message="Demo Data Mode — showing sample data, not real records."
      dismissible
    />
  );
}
