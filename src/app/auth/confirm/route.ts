import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation link handler (token-hash flow).
 *
 * Point the Supabase "Confirm signup" email template at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/today
 * Unlike the PKCE `?code=` link, this works even when the email is opened in a
 * different browser or app than the one used to sign up (common on phones).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const otpType = type || "email";
  if (tokenHash) {
    const supabase = await createClient();
    let { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    if (error && otpType !== "signup") {
      const fb = await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
      if (!fb.error) error = null;
    }
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
