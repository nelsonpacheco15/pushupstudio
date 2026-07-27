import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* TEMPORARY diagnostic: tests whether the deployed runtime can send via Resend
   with the env values Vercel actually has. Protected by CRON_SECRET. Remove after use. */

export async function GET(req: NextRequest) {
  const key = process.env.STUDIO_PASSWORD;
  if (!key || req.nextUrl.searchParams.get("key") !== key) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const to = req.nextUrl.searchParams.get("to") || process.env.STUDIO_EMAIL || "";
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || "";
  const info = {
    resendKeyPresent: !!apiKey,
    resendKeyLen: apiKey.length,
    resendKeyPrefix: apiKey.slice(0, 3),
    from,
    to,
    appUrl: process.env.APP_URL || "",
  };
  if (!apiKey || !to) return NextResponse.json({ ...info, sent: false, reason: "missing key or to" });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "PushUP runtime mail test", html: "<p>Sent from the deployed app runtime.</p>" }),
    });
    const body = await res.text();
    return NextResponse.json({ ...info, sent: res.ok, resendStatus: res.status, resendBody: body.slice(0, 300) });
  } catch (e) {
    return NextResponse.json({ ...info, sent: false, error: String(e).slice(0, 200) });
  }
}
