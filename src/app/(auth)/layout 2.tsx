import type { ReactNode } from "react";
import { AuthBackground } from "@/features/auth/components/auth-background";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";
import { LogoMark } from "@/features/auth/components/logo-mark";
import { SafeAreaView } from "@/components/layout/safe-area-view";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-svh grid-cols-1 md:grid-cols-[38%_1fr] lg:grid-cols-[44%_1fr] xl:grid-cols-2">
      <AuthBackground />

      <AuthBrandPanel />

      <SafeAreaView className="flex min-h-svh flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 md:hidden">
          <LogoMark />
        </div>
        {children}
      </SafeAreaView>
    </div>
  );
}
