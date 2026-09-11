"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LIBRARY_COOKIE_NAME,
  LIBRARY_SESSION_MAX_AGE_SECONDS,
  createLibraryToken,
  isLibraryAccessConfigured,
  verifyLibraryPassword,
} from "@/features/creator-library/auth/session";

export type LibraryAccessState = { error?: string } | null;

/**
 * Validates the shared password server-side and, on success, drops an
 * http-only signed session cookie and sends the visitor into the library.
 * The password never reaches the client; a wrong guess returns a generic
 * message with no timing signal beyond the unavoidable length check.
 */
export async function enterLibraryAction(
  _prevState: LibraryAccessState,
  formData: FormData,
): Promise<LibraryAccessState> {
  if (!isLibraryAccessConfigured()) {
    return { error: "The Creator Library isn't configured yet. Ask an administrator to set CREATOR_LIBRARY_PASSWORD." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the access password." };
  }

  if (!verifyLibraryPassword(password)) {
    return { error: "That password isn't right. Check with whoever shared the library link with you." };
  }

  const token = await createLibraryToken();
  const cookieStore = await cookies();
  cookieStore.set(LIBRARY_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIBRARY_SESSION_MAX_AGE_SECONDS,
  });

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/creator-library") ? redirectTo : "/creator-library");
}

/** Clears the library session and returns the visitor to the password screen. */
export async function exitLibraryAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LIBRARY_COOKIE_NAME);
  redirect("/creator-library");
}
