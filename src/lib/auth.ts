import "server-only";
import { cookies } from "next/headers";

/* Simple single-owner studio auth: a password (STUDIO_PASSWORD env) gates the
   admin side. The session cookie holds a hash of the password so it can't be
   forged without knowing it. The client portal stays token-based (public).
   If STUDIO_PASSWORD is unset the gate is disabled (local dev). */

export const AUTH_COOKIE = "studio_auth";
const SALT = ":pushup-studio";

export async function computeToken(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + SALT));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when auth is disabled (no password configured). */
export function authDisabled(): boolean {
  return !process.env.STUDIO_PASSWORD;
}

export async function isStudio(): Promise<boolean> {
  const pw = process.env.STUDIO_PASSWORD;
  if (!pw) return true; // gate disabled
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return !!token && token === (await computeToken(pw));
}

/** Throw if the caller is not an authenticated studio user. Call at the top of
    every admin-only mutating server action. */
export async function requireStudio(): Promise<void> {
  if (!(await isStudio())) throw new Error("Not authorized — please log in.");
}
