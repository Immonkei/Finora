export interface MailProvider {
  kind: "gmail" | "outlook" | "yahoo" | "other";
  /** Web inbox link, searched for the Finora email where the provider supports it */
  url: string | null;
}

const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];
const OUTLOOK_DOMAINS = ["outlook.com", "hotmail.com", "live.com", "msn.com"];
const YAHOO_DOMAINS = ["yahoo.com", "ymail.com"];

/** Picks the inbox to deep-link to from the email's domain. */
export function detectMailProvider(email: string): MailProvider {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (GMAIL_DOMAINS.includes(domain)) {
    return {
      kind: "gmail",
      url: "https://mail.google.com/mail/u/0/#search/Finora+in%3Aanywhere+newer_than%3A1d",
    };
  }
  if (OUTLOOK_DOMAINS.includes(domain)) return { kind: "outlook", url: "https://outlook.live.com/mail/0/" };
  if (YAHOO_DOMAINS.includes(domain)) return { kind: "yahoo", url: "https://mail.yahoo.com/" };
  return { kind: "other", url: null };
}

/** Shows only the first and last letter of the local part, e.g. "d**a@gmail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
}
