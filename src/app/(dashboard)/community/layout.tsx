import type { ReactNode } from "react";
import { CommunityTabs } from "@/features/community/components/community-tabs";

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Community</h1>
        <p className="text-sm text-muted-foreground">
          Share updates, ask questions, celebrate wins, and find your next collaboration.
        </p>
      </div>

      <CommunityTabs />

      {children}
    </div>
  );
}
