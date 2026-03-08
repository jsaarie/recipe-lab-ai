/**
 * Top 100 most common passwords (sourced from public breach datasets).
 * Used to reject trivially guessable passwords at registration and reset.
 */
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "1234567", "letmein", "trustno1", "dragon",
  "baseball", "iloveyou", "master", "sunshine", "ashley",
  "michael", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael1", "football", "password1", "password123",
  "batman", "login", "starwars", "hello", "charlie",
  "donald", "qwerty123", "whatever", "freedom", "trustme",
  "welcome", "welcome1", "p@ssw0rd", "passw0rd", "admin",
  "admin123", "changeme", "123456789", "1234567890", "000000",
  "111111", "121212", "123321", "666666", "696969",
  "888888", "abcdef", "access", "computer", "hottie",
  "killer", "lovely", "master1", "michael", "mustang",
  "ninja", "pass", "pass123", "princess", "qwer1234",
  "soccer", "thomas", "zaq12wsx", "hunter", "buster",
  "jordan", "pepper", "andrew", "harley", "chelsea",
  "ranger", "robert", "daniel", "matthew", "joshua",
  "hannah", "jessica", "jennifer", "amanda", "samantha",
  "summer", "winter", "spring", "autumn", "diamond",
  "cookie", "banana", "maggie", "ginger", "flower",
  "tigger", "bailey", "george", "secret", "test123",
]);

/** Returns true if the password (case-insensitive) appears in the common passwords list. */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
