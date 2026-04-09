import type { PasswordStrength } from "./types";

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) {
    return "weak";
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 8 && hasLetter && hasNumber && hasSpecial) {
    return "strong";
  }

  return "medium";
}
