"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { AuthCheckbox } from "@/features/auth/components/auth-checkbox";

type ConsentLink = { href: string; label: string };

/**
 * A single required-consent checkbox row for a signup flow: checkbox +
 * label text with one or more embedded links to the legal document(s) it
 * refers to. Links open in a new tab and stop click propagation so reading
 * the document doesn't also flip the checkbox out from under the user.
 * Built on AuthCheckbox so it inherits the same dark/light styling used
 * throughout the auth surfaces — pass `variant` to match the surrounding
 * form (dark for /signup, light for /apply and the kiosk).
 */
export function LegalConsentField({
  text,
  links,
  variant = "dark",
  ...props
}: Omit<ComponentProps<typeof AuthCheckbox>, "label"> & {
  text: string;
  links: ConsentLink[];
  variant?: "dark" | "light";
}) {
  const label = (
    <span>
      {text}{" "}
      {links.map((link, i) => (
        <span key={link.href}>
          {i > 0 && (links.length === 2 ? " and " : i === links.length - 1 ? ", and " : ", ")}
          <Link
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={
              variant === "light"
                ? "font-medium text-black underline underline-offset-2 hover:no-underline"
                : "font-medium text-white underline underline-offset-2 hover:no-underline"
            }
          >
            {link.label}
          </Link>
        </span>
      ))}
    </span>
  );

  return <AuthCheckbox variant={variant} label={label} {...props} />;
}
