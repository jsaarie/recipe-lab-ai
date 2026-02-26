# Recipe Lab AI — Release Log

This document tracks each production deployment, including the version, release date, and a summary of the features and changes included.

---

## V0.5 — Scraper Waterfall & Browser Extension

**Date:** 2026-02-25

### Features

- Three-tier scraping waterfall for bot-protected recipe sites:
  1. **Direct fetch** — fast, free, works for ~70% of sites
  2. **Browserless.io fallback** — triggered on 403/429/timeout; routes through a hosted Chromium that handles Cloudflare bot protection automatically (free tier: 1,000 units/month)
  3. **Extension prompt** — shown as last resort when Browserless is unconfigured or also fails
- Browser extension (`extension/`) for manual scraping of any blocked site:
  - Toolbar button grabs the current tab's full rendered HTML and opens it in Recipe Lab
  - MV3 manifest; compatible with Chrome, Edge, Arc, Brave (load unpacked from `extension/`)
  - Placeholder icons in Recipe Lab green; swap for real assets before publishing
- `BROWSERLESS_API_KEY` env var wires up the Browserless fallback (optional — app degrades gracefully without it)
- Scraper timeout raised from 5s → 8s so Cloudflare has time to return a 403 before the connection is aborted
- Timeout/AbortError now correctly detected as a blocked signal (Cloudflare often hangs rather than rejecting)

---

## V0.4.1 — Polish & Bug Fixes

**Date:** 2026-02-18

### Features

- Wake lock toggle in Lab HUD header: keeps screen awake while cooking; Lightbulb icon shows active/inactive state (auto-requested on Lab entry)
- Lab Complete screen: swipe-right and left-tap-zone navigate back to the last step; slide-in animation on enter; edge arrow hint (fades after 3s); "Back to Last Step" button on desktop
- Looping timer alarm: three-tone chime repeats every 2s until dismissed; vibration pattern loops in sync; toast now pulses with "Tap to dismiss" label; no more 5s auto-dismiss

### Bug Fixes

- API now rejects pages that return no title, ingredients, or instructions (422) with a clear "No recipe found" message
- Error messages from recipe parsing are now lifted to `HomePage` state so they survive `RecipeInput` remounts during loading — errors no longer vanish after the loading spinner
- Fixed "page reload" visual glitch on S4: removed `!loading` from recipe view condition so the recipe card no longer unmounts while a new URL is being fetched
- Cook time values over 60 min now display as `1h 30m` instead of raw "90 min" across both the Recipe Card MetaPills and Lab Banner
- Lab Banner now falls back to `prepTime + cookTime` when `totalTime` is missing from the parsed recipe
- Lab Banner and Recipe Card time values are consistently formatted to abbreviated form (`1h`, `45m`, `1h 30m`)

---

## V0.4 — Smart Ingredients

**Date:** 2026-02-16

### Features

- Per-step ingredient mapping: each Lab HUD step now highlights the ingredients needed for that step
  - AI maps ingredients to steps using index-based response schema (low-latency, minimal tokens)
  - Powered by Gemini 2.5 Flash
- Optimistic UI: recipe page loads immediately (~300ms), Cook button unlocks in the background (~1s) once ingredient mapping completes
  - LabBanner shows "Mapping ingredients…" spinner while loading; Cook button disabled until ready
- Streaming HTML scraper: download aborted as soon as JSON-LD Recipe block is fully received (saves 60–65% of HTML download for structured-data sites)
- Split API architecture: `/api/parse-recipe` returns immediately; `/api/map-ingredients` runs as a background call from the client
- Extended thinking disabled on Gemini (`thinkingBudget: 0`) for fast, deterministic responses
- Homepage copy: added "Stop Scrolling. Start Cooking." subtitle and helper text below input
- Input placeholder updated to "Paste a recipe link..."
- Step Timer tap target expanded to the entire widget (circle + label) instead of a small button

---

## V0.3 — Step Timers

**Date:** 2026-02-16

### Features

- Auto-detected countdown timers in the Lab HUD
  - Client-side regex detects durations in instruction text (e.g. "bake for 25 minutes")
  - Supports simple durations, ranges (uses higher bound), and compound times (e.g. "1 hour and 30 minutes")
- Circular SVG radial progress bar with countdown text centered inside
  - Idle: full ring with duration, "Start Timer" button below
  - Running: arc depletes as time passes, "Pause" button below
  - Paused: arc frozen, "Resume" button below
  - Finished: checkmark with "Done!" inside full ring
- Multiple concurrent timers across different steps
- Background timer pills (sorted by step number) showing running timers on other steps, tappable to jump
- Toast notification on timer completion with two-tone Web Audio chime and device vibration
- Progress bar and step label moved above instruction text, label left-aligned
- Cook button repositioned under recipe title (removed duplicate title from Lab Banner)
- Non-breaking space and HTML entity cleanup in scraped recipe text

---

## V0.2 — The Lab (Cooking HUD)

**Date:** 2026-02-15

### Features

- Lab Entry Banner on recipe view with slide-down animation, showing recipe title, step count, and total time
- "Enter the Lab" button transitions to a full-screen guided cooking HUD
- Lab HUD with:
  - Recipe title in header with "Exit Lab" navigation
  - Progress dot indicators (filled = completed, ring = current, hollow = upcoming)
  - Tappable dots to jump between steps
  - Centered current step instruction with "STEP N of M" label
  - Slide left/right transitions between steps (~200ms)
  - "Done — Next Step" action button (fixed bottom bar on mobile, inline on desktop)
  - Last step changes button to "Finish Recipe" and hides On Deck
- Dirty-hands mobile navigation:
  - Swipe left/right gestures to advance or go back between steps
  - Invisible tap zones (left 40% = back, right 40% = next, center 20% dead zone)
  - Subtle edge arrow hints that fade after 3 seconds, reappear on step change
  - Haptic feedback on swipe (navigator.vibrate)
  - Fixed bottom button removed on mobile; inline button retained on desktop
- Recipe Complete celebration screen with "Enjoy!", step count summary, and two actions:
  - "View Full Recipe" returns to recipe view
- View state management preserving step position when flipping between Lab and recipe view

---

## V0.1 — MVP Launch

**Date:** 2026-02-15

### Features

- Single-page app with URL input for recipe extraction
- AI-powered recipe parsing from any recipe URL
- Clean, structured recipe display including:
  - Recipe title and source attribution
  - Prep time, cook time, total time, and servings
  - Scannable ingredient list
  - Numbered step-by-step instructions
  - Notes/tips when present in the original
- Responsive, mobile-friendly design for kitchen use
- Error handling for invalid URLs and non-recipe pages

---

<!-- Template for future releases:

## VX.X — Release Title

**Date:** YYYY-MM-DD

### Features

- Feature or change description

### Bug Fixes

- Fix description (if applicable)

### Known Issues

- Issue description (if applicable)

-->
