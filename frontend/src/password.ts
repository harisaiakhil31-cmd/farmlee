// Shared password-policy helpers used by Change Password & Reset Password screens.
export type PwdRule = { key: string; label: string; test: (s: string) => boolean };

export const PWD_RULES: PwdRule[] = [
  { key: "len",     label: "At least 8 characters",     test: (s) => s.length >= 8 },
  { key: "upper",   label: "One uppercase letter (A-Z)", test: (s) => /[A-Z]/.test(s) },
  { key: "lower",   label: "One lowercase letter (a-z)", test: (s) => /[a-z]/.test(s) },
  { key: "digit",   label: "One number (0-9)",            test: (s) => /\d/.test(s) },
  { key: "special", label: "One special character",       test: (s) => /[^A-Za-z0-9]/.test(s) },
];

export function isStrong(pwd: string): boolean {
  return PWD_RULES.every((r) => r.test(pwd));
}
