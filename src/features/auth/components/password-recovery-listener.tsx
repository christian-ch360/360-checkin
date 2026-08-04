"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Belt-and-suspenders for the password recovery flow: /reset-password is the
// intended landing point (see resetPasswordForEmail's redirectTo), but if
// Supabase's dashboard "Site URL" ever overrides that, a recovery session can
// establish itself on some other public page instead. Mounted app-wide so
// that wherever it lands, the user still ends up on the reset form rather
// than silently signed in with a one-time recovery session.
export function PasswordRecoveryListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        router.replace("/reset-password");
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [router]);

  return null;
}
