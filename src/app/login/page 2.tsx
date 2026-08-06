import { LoginForm } from "@/features/auth/components/login-form";
import { LoginHero } from "@/features/auth/components/login-hero";
import { LogoMark } from "@/features/auth/components/logo-mark";
import { SafeAreaView } from "@/components/layout/safe-area-view";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; redirectTo?: string }>;
}) {
  const { message, redirectTo } = await searchParams;

  return (
    <div className="grid min-h-svh grid-cols-1 bg-white md:grid-cols-[38%_1fr] lg:grid-cols-[44%_1fr] xl:grid-cols-2">
      <LoginHero />

      <SafeAreaView className="flex min-h-svh flex-col items-center justify-center bg-white px-5 py-12 sm:px-8">
        <div className="mb-8 md:hidden">
          <LogoMark variant="light" />
        </div>
        <LoginForm message={message} redirectTo={redirectTo} />
      </SafeAreaView>
    </div>
  );
}
