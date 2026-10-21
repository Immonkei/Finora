import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) || "signup";
  const nextParam = searchParams.get("next");
  // Only allow same-site relative redirects
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/today";

  // Helper redirect taking into account x-forwarded-host
  const makeRedirect = (path: string) => {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${path}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${path}`);
    } else {
      return NextResponse.redirect(`${origin}${path}`);
    }
  };

  // 1. Code flow (OAuth or PKCE)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return makeRedirect(next);
    }
  }

  // 2. Token hash flow (fallback if confirmation link routed to callback)
  if (tokenHash) {
    const supabase = await createClient();
    let { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error && type !== "email") {
      const fb = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
      if (!fb.error) error = null;
    }
    if (!error) {
      return makeRedirect(next);
    }
  }

  // Provider cancelled (e.g. Google consent closed) vs. an expired/used email link
  const reason = searchParams.get("error") ? "oauth_failed" : "link_expired";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
