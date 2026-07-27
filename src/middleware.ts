import { NextResponse, type NextRequest } from "next/server";

/* Gates the studio/admin pages behind the studio password. The client portal
   (/portal) and stylescape review (/review) are intentionally NOT matched — they
   are public, secured by their secret tokens. Server actions additionally call
   requireStudio() for defence in depth. */

const SALT = ":pushup-studio";

async function computeToken(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + SALT));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const pw = process.env.STUDIO_PASSWORD;
  if (!pw) return NextResponse.next(); // gate disabled when no password set

  const token = req.cookies.get("studio_auth")?.value;
  if (token && token === (await computeToken(pw))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/client/:path*", "/ticket/:path*", "/build/:path*", "/billing", "/billing/:path*", "/settings", "/settings/:path*"],
};
