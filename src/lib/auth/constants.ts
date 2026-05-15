export const DUMMY_EMAIL_DOMAIN =
  process.env.DUMMY_EMAIL_DOMAIN ?? "dummy.cityup.local";

export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern: /^[a-zA-Z0-9_-]+$/,
} as const;

export const PASSWORD_RULES = {
  minLength: 8,
  requireLetter: true,
  requireDigit: true,
} as const;

export const RECOVERY_CODE_LENGTH = 12;

export const RECOVERY_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const BCRYPT_ROUNDS = 10;

export function usernameToDummyEmail(username: string): string {
  return `${username.toLowerCase()}@${DUMMY_EMAIL_DOMAIN}`;
}
