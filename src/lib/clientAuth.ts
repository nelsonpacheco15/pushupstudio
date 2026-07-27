import "server-only";
import { cookies } from "next/headers";

/* Per-client account auth. Each client can be given an email + password by the
   studio. On login we set a signed cookie holding the client id so it can't be
   forged without the server secret. This is separate from the studio owner gate
   (auth.ts) and from the public portal token (which still works as a share link). */

export const CLIENT_COOKIE = "client_auth";
const SALT = ":pushup-locker";

function secret(): string {
  return process.env.CLIENT_AUTH_SECRET || process.env.STUDIO_PASSWORD || "pushup-locker-dev";
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a client's password for storage (clients.password_hash). */
export async function hashPassword(password: string): Promise<string> {
  return sha256(password + SALT);
}

/** Signed cookie value for a logged-in client: `<id>.<sig>`. */
export async function signClient(clientId: string): Promise<string> {
  const sig = await sha256(clientId + "|" + secret());
  return `${clientId}.${sig}`;
}

/** Verify a cookie value and return the client id, or null if invalid. */
export async function verifyClientCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await sha256(id + "|" + secret());
  return sig === expected ? id : null;
}

/** Read the current logged-in client id from cookies (server components). */
export async function getClientSession(): Promise<string | null> {
  const v = (await cookies()).get(CLIENT_COOKIE)?.value;
  return verifyClientCookie(v);
}
