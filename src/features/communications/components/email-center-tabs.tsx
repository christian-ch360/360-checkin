import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "inbox", label: "Inbox", href: "/admin/email-center" },
  { key: "archive", label: "Archive", href: "/admin/email-center/archive" },
] as const;

export function EmailCenterTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
