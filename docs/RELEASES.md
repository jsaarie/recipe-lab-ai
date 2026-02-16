# Recipe Lab AI — Release Log

This document tracks each production deployment, including the version, release date, and a summary of the features and changes included.

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
