# Auth setup (Google sign-in & email verification)

The app code is ready; these dashboard settings make it work in your Supabase project.

## 1. Run the new migrations

In the Supabase SQL Editor, run in order:

1. `supabase/migrations/20261021000001_account_balances.sql`
2. `supabase/migrations/20261021000002_profile_names.sql`: adds `profiles.full_name` / `avatar_url`, backfills them, and updates the new-user trigger so names from the sign-up form or Google are saved automatically.

## 2. URL configuration

**Authentication → URL Configuration**

- **Site URL:** your production URL, e.g. `https://finora.vercel.app`
- **Redirect URLs:** add
  - `https://finora.vercel.app/auth/callback`
  - `https://finora.vercel.app/auth/confirm`
  - `http://localhost:3000/auth/callback` (local development)

## 3. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → **Create credentials → OAuth client ID** → *Web application*.
2. **Authorized JavaScript origins:** your site URL (and `http://localhost:3000`).
3. **Authorized redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase under the Google provider).
4. **OAuth consent screen:** app name *Finora*, support email, logo; scopes `email`, `profile`, `openid`. Publish the app (otherwise only test users can sign in).
5. In Supabase **Authentication → Providers → Google**: enable it and paste the Client ID and Client Secret.

Google accounts arrive already verified, and their name and photo are copied into the profile.

## 4. Email verification (link + 6-digit code)

**Authentication → Providers → Email:** keep **Confirm email** on.

**Authentication → Email Templates → Confirm signup**. Replace the body so it has both a link and the code that the `/verify-email` screen accepts:

```html
<h2>Confirm your Finora account</h2>
<p>Hi {{ .Data.full_name }},</p>
<p>Tap the button to activate your account:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/today">Confirm email</a></p>
<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
<p>If you didn't create a Finora account, you can ignore this email.</p>
```

The `/auth/confirm` link works even when the email is opened in a different browser or app than the one used to sign up, which happens often on phones.

**Optional, recommended for production:** set up custom SMTP (**Project Settings → Auth → SMTP**, e.g. Resend or Gmail SMTP). The built-in sender is rate limited to a few emails per hour and often lands in Spam or Promotions.

## Flow summary

| Step | Route |
| --- | --- |
| Sign up (name, email, password) | `/register`, then `/verify-email?email=…` |
| Confirm via link | `/auth/confirm?token_hash=…` → `/today` |
| Confirm via code | `/verify-email` → `verifyOtp` → `/today` |
| Google | `/auth/callback?code=…` → `/today` |
| Expired/used link | `/login?error=link_expired` (banner + resend from `/verify-email`) |
