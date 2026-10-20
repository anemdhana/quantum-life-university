const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[!@#$%^&*()\-_=+]/;

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_HINT =
  "At least 12 characters, with a lowercase letter, an uppercase letter, a number, and a symbol (!@#$%^&*()-_=+).";

export function passwordProblems(password: string, email?: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (!LOWER.test(password)) problems.push("Add a lowercase letter.");
  if (!UPPER.test(password)) problems.push("Add an uppercase letter.");
  if (!DIGIT.test(password)) problems.push("Add a number.");
  if (!SYMBOL.test(password)) problems.push("Add a symbol such as ! @ # or -.");
  if (email && password.toLowerCase() === email.toLowerCase()) problems.push("Do not use your email as the password.");
  return problems;
}
