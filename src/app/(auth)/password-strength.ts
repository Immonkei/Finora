export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/**
 * Rough strength score: 0 = too short, 1 weak, 2 fair, 3 good, 4 strong.
 * Rewards length and character variety; penalizes very common patterns.
 */
export function scorePassword(password: string): PasswordStrength {
  if (password.length < 8) return 0;
  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/^(?:password|12345678|qwerty|abc12345|11111111)/i.test(password) || /(.)\1{3,}/.test(password)) {
    score = Math.min(score, 1);
  }
  return Math.max(1, Math.min(4, score)) as PasswordStrength;
}
