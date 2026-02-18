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
- AI-powered recipe extraction and parsing from any URL
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
| v0.5 | Kitchen Psychology | AI classifies each recipe into a cooking archetype (Precision, Fire & Speed, Low & Slow, Assembly, Simmer & Build) at parse time; the Lab HUD adapts its information hierarchy and layout density to match the energy and cognitive demands of that style of cooking |
| v1.0 | The Lab Complete | Fully integrated guided cooking experience — confirm a recipe, enter the Lab, cook step-by-step with per-step ingredients, timers, and seamless recipe/Lab switching |

### Post-V1.0 Horizon

| Phase | Features |
|-------|----------|
| v1.1 | User accounts and authentication, save recipes to personal collections |
| v1.2 | Scaling and unit conversion — adjust servings with auto-recalculated quantities |
| v1.3 | Smart ingredient substitutions based on availability |
| v1.4 | Meal planning and grocery list generation |
| v2.0 | Voice-controlled Lab navigation, technique tips, and pro cooking advice |

## Success Metrics (MVP)

- User can paste a URL and see a parsed recipe in under 2 seconds
- Works with at least 90% of popular recipe websites
- Mobile-friendly layout scores 90+ on Lighthouse
- Clean, readable output with no missing recipe data

## Constraints

- No user data storage in MVP (stateless)
- AI costs should be minimal per request (optimize prompt size)
- Must handle recipe pages in English (multi-language is post-MVP)
