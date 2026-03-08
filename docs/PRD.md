# Recipe Lab AI — Product Requirements Document

## Vision

Recipe Lab AI is a personal sous-chef web app that transforms messy recipe web pages into clean, distraction-free cooking experiences. Paste any recipe URL and get a beautifully formatted, easy-to-follow recipe — no ads, no life stories, just the recipe.

## Problem Statement

Recipe websites are cluttered with ads, long personal narratives, pop-ups, and poor formatting. Home cooks waste time scrolling past irrelevant content to find the actual recipe. Existing "print recipe" features are inconsistent and still poorly formatted.

## Target Users

- Home cooks who find recipes online and want a clean reading/cooking experience
- Busy people who want to quickly extract and follow a recipe without distractions
- Anyone who bookmarks recipe URLs and wants them in a consistent, readable format

## MVP Scope (v0.1)

The MVP focuses on a single, well-executed feature:

**Paste a recipe URL → Get a clean, structured recipe.**

### What MVP Includes

- Single-page app with a URL input field
- AI-powered recipe extraction from any URL using Gemini 2.5 Flash
- Clean, structured recipe display with:
  - Recipe title and source attribution
  - Prep time, cook time, total time, servings
  - Ingredient list (structured and scannable)
  - Step-by-step instructions (numbered, clear)
  - Notes/tips if present in the original
- Responsive design (mobile-friendly for kitchen use)
- Error handling for invalid URLs or non-recipe pages

### What MVP Does NOT Include

- User accounts or authentication
- Recipe saving/collections
- Meal planning
- Ingredient substitution suggestions
- Cooking timers
- Voice interaction
- Social/sharing features

## Future Roadmap (Post-MVP)

The roadmap is centered around **The Lab** — a guided cooking HUD that takes users step-by-step through a recipe as they cook. Features build progressively toward a polished V1.0 Lab experience.

| Phase | Focus | Features |
|-------|-------|----------|
| v0.2 | Lab Foundation | Cooking HUD entry point ("Cook" button), full-screen single-step view with large Next/Back tap targets, collapsible mini-overview strip for step jumping, progress indicator (Step N of M) |
| v0.3 | Timers | Optional user-triggered step timers, up to 3 concurrent timers in a visible timer tray, audio/visual alerts on completion |
| v0.4 | Smart Ingredients | AI-powered per-step ingredient mapping shown in the HUD, expandable full ingredient list panel |
| v1.0 | The Lab Complete | Fully integrated guided cooking experience — confirm a recipe, enter the Lab, cook step-by-step with per-step ingredients, timers, and seamless recipe/Lab switching |

### Post-V1.0 Horizon — V2.x Series

The v2.x series focuses on **recipe personalization and user accounts**, shipped in thin slices so each release is independently useful.

| Phase | Focus | Features | Status |
|-------|-------|----------|--------|
| v2.1 | Recipe Editing | Session-based serving size scaling, manual quantity editing, ingredient swapping (free-text), measurement conversion (US ↔ Metric, Weight ↔ Volume, F ↔ C) | **Shipped** |
| v2.2 | Accounts & Profiles | User registration (email + password via NextAuth.js), login with TOTP MFA, user profile with display name, default unit system, preferred serving size | **Shipped** |
| v2.3 | Save & Access Recipes | Save parsed recipes to personal library (preserves active scaling/swaps), dedicated library page, open saved recipes back into recipe card view | **Shipped** |
| v2.4 | Library Management | Search and filter saved recipes, edit saved recipe details (rename, notes, ingredients, steps), delete recipes from library | Backlog |

### Post-V2.x Horizon — V3.x Series

The v3.x series focuses on **new recipe input methods**, starting with digitizing physical cookbooks.

| Phase | Focus | Features | Status |
|-------|-------|----------|--------|
| v3.0 | Cookbook Digitization | Photograph printed cookbook pages (up to 2 photos), AI vision extraction into standard recipe format, pre-save review/edit screen, "Digitized" badge in library | **Shipped** |
| v3.1 | Batch & Handwriting | Multi-photo batch import, handwriting support for recipe cards | Backlog |
| v3.x | AI Swaps | AI-suggested ingredient substitutions with ratio adjustments (replaces free-text swap from v2.1) | Backlog |

### Post-V3.x Horizon — V4.x Series

The v4.x series introduces **gamification and social features** to turn Recipe Lab AI into an engaging culinary RPG.

| Phase | Focus | Features | Status |
|-------|-------|----------|--------|
| v4.0 | Recipe Feedback | Star ratings (1–5) and cook notes per saved recipe, post-lab completion prompt, feedback displayed in library | **Shipped** |
| v4.1 | Culinary RPG & XP | Skill XP for cooking actions, 7-tier culinary title system, milestone badges, XP bar and title badge in nav | **Shipped** |
| v4.2 | Leaderboards | Global and friend leaderboards ranked by XP | Backlog |
| v4.x | Random Recipe Roll | AI-powered "Surprise Me" recipe suggestion based on user taste profile | Backlog |

### Key Dependencies

```
v2.1 ─────────────────────────────── (standalone, no auth or DB required) ✓ SHIPPED
v2.2 (auth + profiles) ─────────────────────────────────────────────────── ✓ SHIPPED
v2.3 (save) ──→ v2.4 (manage)   (both require v2.2 auth)                  v2.3 ✓ SHIPPED
v3.0 (digitization) ─────────────── requires v2.3 library + v2.4 editing  ✓ SHIPPED
v4.0 (feedback) ─────────────────── requires v2.3 savedRecipes             ✓ SHIPPED
v4.1 (RPG/XP) ───────────────────── requires v4.0 feedback                 ✓ SHIPPED
```

v2.1 ships independently. v2.3 and v2.4 both require v2.2 auth to be stable first.

### Open Design Decisions (resolved and pending)

- **Weight ↔ Volume conversion**: Resolved — static lookup table (`src/lib/density.ts`, ~100 ingredients). Items not in the table fall back to volume-only or weight-only display.
- **SMS OTP cost**: Deferred indefinitely. SMS was not implemented in v2.2. Only TOTP (authenticator app) MFA was shipped.
- **Email OTP**: Not implemented in v2.2. `emailVerified` is auto-set to the current date at registration; a real email verification flow is deferred to a future patch.
- **Avatar uploads**: Not implemented in v2.2. The profile page stores a name, default unit system, and preferred servings only.

## v4.1 Implementation Status

v4.1 is **fully shipped** as of Mar 2026.

| Feature | Status | Notes |
|---------|--------|-------|
| XP award on recipe completion | Shipped | 100 XP; once per recipe |
| XP award on rating | Shipped | 15 XP; once per recipe |
| XP award on cook notes | Shipped | 20 XP; once per recipe |
| XP award on OCR scan | Shipped | 50 XP; once per recipe |
| XP award on URL extract | Shipped | 5 XP (not in original spec — added) |
| XP award on ingredient substitute | Shipped | 10 XP (not in original spec — added) |
| 7-tier culinary title system | Shipped | Tiers: Home Cook → Iron Chef (top tier renamed from "Master Chef") |
| XP progress bar | Shipped | `xp-progress.tsx` component on profile page |
| Nav bar title badge | Shipped | Compact culinary title in `user-nav.tsx` |
| Milestone badges | Shipped | Core + extended badges; `src/lib/xp.ts` `computeBadges()` |
| `GET /api/user/progress` | Shipped | Returns XP, tier, title, badges |
| `POST /api/user/progress/xp` | Shipped | Awards XP for a validated action |
| Random Recipe Roll | Not shipped | Deferred to v4.x backlog |

---

## v4.0 Implementation Status

v4.0 is **fully shipped** as of Mar 2026.

| Feature | Status | Notes |
|---------|--------|-------|
| Star rating (1–5) on saved recipe | Shipped | `PATCH /api/library/[id]/feedback` |
| Cook notes on saved recipe | Shipped | Same endpoint |
| Post-lab completion modal prompt | Shipped | "Rate This Recipe" button on lab-complete screen |
| Feedback modal (stars + text area) | Shipped | `feedback-modal.tsx` |
| Star rating shown on library cards | Shipped | Library grid displays rating if set |
| Full feedback on recipe detail | Shipped | Stars + notes visible when opening from library |

---

## v3.0 Implementation Status

v3.0 is **fully shipped** as of Mar 2026.

| Feature | Status | Notes |
|---------|--------|-------|
| Camera / photo upload UI | Shipped | Up to 2 photos; mobile camera input |
| Gemini Vision extraction | Shipped | `POST /api/parse-image`; same ParsedRecipe schema |
| Pre-save review/edit screen | Shipped | Editable before saving |
| "Digitized" badge in library | Shipped | Camera icon on library cards |
| Handwriting support | Not shipped | Deferred to v3.1 |
| Batch import | Not shipped | Deferred to v3.1 |

---

## v2.2 Implementation Status

v2.2 is **fully shipped** as of Feb 2026.

| Feature | Status | Notes |
|---------|--------|-------|
| Email + password registration | Shipped | Zod-validated; password requires min 8 chars, upper, lower, digit |
| bcrypt password hashing | Shipped | bcryptjs, 12 salt rounds |
| Login (credentials) | Shipped | NextAuth.js credentials provider; rejects unverified emails |
| JWT sessions | Shipped | `strategy: "jwt"` — no server-side session storage |
| MongoDB user persistence | Shipped | `@auth/mongodb-adapter`; `users` collection |
| TOTP MFA (authenticator app) | Shipped | `otplib` v13 with NobleCryptoPlugin + ScureBase32Plugin; QR code via `qrcode` |
| MFA challenge middleware | Shipped | Middleware redirects to `/verify-mfa` when `mfaEnabled && !mfaVerified` |
| Profile page | Shipped | Display name, default unit system, preferred servings; at `/profile` (protected route) |
| User nav | Shipped | Avatar/initials dropdown in header; shows sign in/sign up when logged out |
| Email OTP | Not shipped | Deferred; `emailVerified` auto-set at registration |
| SMS OTP | Not shipped | Deferred indefinitely |
| Avatar upload | Not shipped | No image upload; initials fallback only |
| Change password | Not shipped | No password change flow in this release |

---

## v2.1 Implementation Status

v2.1 is **fully shipped** as of Feb 2026. All four pillars are implemented:

| Feature | Status | Notes |
|---------|--------|-------|
| Serving size scaling | Shipped | All quantities scale proportionally; min 1 serving enforced |
| Quantity editing | Shipped | Inline tap-to-edit; override pins value (excluded from further scaling) |
| Ingredient swapping | Shipped | Free-text only; "(swapped)" badge; clear swap button |
| Measurement conversion | Shipped | US↔Metric volume/weight + F↔C in instruction text |

All known issues from v2.1 were resolved in the v2.1.1 patch (2026-02-25). See [RELEASES.md](RELEASES.md) for the full list of fixes.

## Success Metrics (MVP)

- User can paste a URL and see a parsed recipe in under 2 seconds
- Works with at least 90% of popular recipe websites
- Mobile-friendly layout scores 90+ on Lighthouse
- Clean, readable output with no missing recipe data

## Constraints

- No user data storage in MVP (stateless)
- AI costs should be minimal per request (optimize prompt size)
- Must handle recipe pages in English (multi-language is post-MVP)
