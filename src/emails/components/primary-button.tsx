import { Button } from "@react-email/components";
import type { ReactNode } from "react";
import { COLORS } from "@/emails/components/colors";

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: COLORS.accent,
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: 10,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      {children}
    </Button>
  );
}
