import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation link handler (token-hash or code flow).
 *
 * Point the Supabase "Confirm signup" email template at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/today
 * Unlike the PKCE `?code=` link, this works even when the email is opened in a
 * different browser or app than the one used to sign up (common on phones).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  // 1. Verify token_hash if present
  if (tokenHash) {
    const supabase = await createClient();
    const otpType = type || "signup";
    let { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    if (error && otpType !== "email") {
      const fb = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
      if (!fb.error) error = null;
    }
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 2. Exchange code if PKCE code was passed instead
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}

/** Only allow same-site relative redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
}
