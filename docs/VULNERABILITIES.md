# Recipe Lab AI — Security Vulnerabilities Log

A running log of security vulnerabilities and weaknesses identified through code review and security audits. Items should be triaged, assigned a severity, and tracked through to remediation.

## Severity Key

- `critical` — Immediate exploitation risk; block release or deploy hotfix now
- `high` — Significant risk; must be resolved before v2.2 ships to production
- `medium` — Notable weakness; resolve before public launch
- `low` — Best-practice gap; address as time allows

## Status Key

- `open` — Not yet addressed
- `in progress` — Actively being worked on
- `resolved` — Fixed (include PR/commit ref)
- `wontfix` — Acknowledged but intentionally not addressing (include rationale)

---

## Open

| # | Date | Severity | Feature / Area | Vulnerability | Status | Notes |
|---|------|----------|----------------|---------------|--------|-------|
| V-01 | 2026-02-26 | critical | Infrastructure — Secrets | Database credentials in `.env.local` may be committed to git history. MongoDB Atlas connection string (`mongodb+srv://...`) exposes full DB access to anyone with repo access. | open | Rotate `eriksaarie_db_user` password immediately. Verify `.env.local` is in `.gitignore`. If ever committed, purge with `git filter-repo`. |
| V-02 | 2026-02-26 | critical | Auth — Session Security | `AUTH_SECRET` not confirmed set in production. Without it, NextAuth JWT signing fails or falls back to an insecure default, enabling session forgery. | open | Generate with `openssl rand -base64 32` and set in Vercel environment variables. |
| V-03 | 2026-02-26 | high | Auth — Brute Force | No rate limiting on any authentication endpoint. MFA verify accepts 6-digit codes (1M combinations) with unlimited attempts, making brute-force trivial. Affects `/api/auth/register`, `/api/user/mfa/verify`, `/api/user/mfa/setup`. | open | Implement rate limiting: 5 login attempts per user per 15 min; 5 MFA attempts per user per 15 min; 10 registration attempts per IP per hour. |
| V-04 | 2026-02-26 | high | Auth — MFA Enforcement | MFA verification calls `update({ mfaVerified: true })` from the client side only. If server-side middleware does not enforce `mfaVerified` on every protected request, the flag can be bypassed. | open | Audit `src/proxy.ts` to confirm all protected routes check `session.user.mfaVerified === true` server-side. |
| V-05 | 2026-02-26 | high | Auth — Brute Force | NextAuth Credentials provider has no built-in account lockout. No protection against high-frequency password guessing on the login endpoint. | open | Track failed login attempts per user in DB; lock account after N failures with exponential backoff. |
| V-06 | 2026-02-26 | high | Auth — Password Policy | Password regex requires only 8+ chars, mixed case, and a digit. No special character requirement, no common password blacklist, no breached-password check. | open | Add special character requirement. Consider `zxcvbn` for strength estimation. Check against HaveIBeenPwned API or a local common-passwords list. |
| V-07 | 2026-02-26 | medium | Auth — Account Recovery | No password reset or password change endpoint exists. A compromised password cannot be revoked by the user. | open | Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`. Reset tokens must expire after 1 hour and be single-use. |
| V-08 | 2026-02-26 | medium | Auth — Email Verification | Email is auto-verified on registration (`emailVerified: now`) without any confirmation flow. Allows registration with arbitrary/fake email addresses. | open | Set `emailVerified: null` on registration. Generate a verification token, send confirmation email, and only set the date after the user confirms. |
| V-09 | 2026-02-26 | medium | Auth — Account Enumeration | Registration returns HTTP 409 with the message "An account with that email already exists." This lets an attacker enumerate which emails are registered on the platform. | open | Return a generic response for both new and duplicate registrations, e.g. "If this email is not registered, you will receive a confirmation link." |
| V-10 | 2026-02-26 | medium | Auth — MFA Recovery | No backup codes generated during MFA setup. If a user loses their authenticator device, they are permanently locked out with no recovery path. | open | Generate 10 single-use backup codes at MFA setup. Store as hashed values. Allow one-time use during MFA challenge. Display only once with a prominent save warning. |
| V-11 | 2026-02-26 | medium | Auth — Session Lifetime | No explicit `maxAge` set in NextAuth session config. Default JWT sessions last 30 days, significantly increasing the exploitation window for a stolen token. | open | Set `session: { strategy: "jwt", maxAge: 24 * 60 * 60 }` (24 hours) in `src/auth.ts`. |
| V-12 | 2026-02-26 | medium | Infrastructure — HTTP Headers | Next.js app does not set security headers: `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `X-XSS-Protection`. | open | Add a `headers()` function to `next.config.ts` applying these headers to all routes. |
| V-13 | 2026-02-26 | medium | Auth — Input Normalisation | Email addresses are not normalised before lookup or storage. `user@example.com` and `User@Example.COM` are treated as different accounts, enabling duplicate registrations. | open | Apply `.toLowerCase().trim()` to email before any DB read or write in the register and login flows. |
| V-14 | 2026-02-26 | low | Auth — Session Invalidation | Active sessions are not invalidated when a user changes their password. A stolen session token remains valid even after the password is rotated. | open | On password change, invalidate all existing sessions for that user (e.g. store a `sessionVersion` in DB and include in JWT; bump on password change). |
| V-15 | 2026-02-26 | low | User Profile — Silent Update Failure | `updateOne` in `src/app/api/user/profile/route.ts` does not check `result.matchedCount`. If the user document is missing, the update silently succeeds with no changes made. | open | Return a 404 if `matchedCount === 0` after the update call. |
| V-16 | 2026-02-26 | low | Infrastructure — Audit Logging | No audit log for security-relevant events: failed logins, MFA enable/disable, password changes, account profile updates. Limits ability to detect and investigate incidents. | open | Log events to a MongoDB `auditLogs` collection with `userId`, `event`, `ip`, `userAgent`, and `timestamp`. |
| V-17 | 2026-02-26 | low | Auth — Account Deletion | No `DELETE /api/user/profile` endpoint. Users cannot delete their accounts, which is a GDPR/privacy concern. | open | Implement account deletion endpoint. Cascade-delete or anonymise all associated user data. |

---

## Resolved

| # | Date | Severity | Feature / Area | Vulnerability | Resolution | PR / Commit |
|---|------|----------|----------------|---------------|------------|-------------|
| — | — | — | — | — | — | — |

---

## Audit History

| Date | Scope | Conducted By | Notes |
|------|-------|--------------|-------|
| 2026-02-26 | v2.2 — Auth, MFA, User Profile, Session Management | Claude Code (security analysis) | Full static analysis of all auth-related source files. 17 issues identified across 4 severity levels. |

---

## How to Add a Vulnerability

1. Add a new row to the **Open** table.
2. Assign the next available `#` (prefix `V-`).
3. Fill in `Date` (YYYY-MM-DD), `Severity`, `Feature / Area`, and describe the vulnerability clearly — include the attack vector and impact.
4. Leave `Status` as `open` until someone picks it up.
5. When resolved, move the row to the **Resolved** table and add the resolution summary and PR/commit reference.
