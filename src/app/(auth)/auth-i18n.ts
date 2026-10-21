import type { MESSAGES } from "@/lib/i18n/messages";

type AuthKey = keyof (typeof MESSAGES)["auth"]["en"];
type AuthT = (key: AuthKey, values?: Record<string, string | number>) => string;

const KNOWN_ERRORS: Array<[RegExp, AuthKey]> = [
  [/invalid login credentials/i, "errInvalidCredentials"],
  [/email not confirmed/i, "errEmailNotConfirmed"],
  [/already (been )?registered|already exists/i, "errUserExists"],
  [/password should|weak password|password is too weak/i, "errWeakPassword"],
  [/invalid format|valid email|email address .* is invalid/i, "errInvalidEmail"],
  [/rate limit|too many requests|for security purposes/i, "errRateLimit"],
  [/error sending (confirmation|recovery) email/i, "errEmailDelivery"],
  [/failed to fetch|network/i, "errNetwork"],
];

/** Maps a raw Supabase auth error message to a translated one, falling back to the raw text. */
export function translateAuthError(t: AuthT, message: string | undefined): string {
  if (!message) return t("tryAgain");
  for (const [pattern, key] of KNOWN_ERRORS) {
    if (pattern.test(message)) return t(key);
  }
  return message;
}

/** Description for a caught exception: translated when recognized, raw otherwise. */
export function describeUnknownError(t: AuthT, err: unknown): string {
  return err instanceof Error ? translateAuthError(t, err.message) : t("tryAgain");
}
