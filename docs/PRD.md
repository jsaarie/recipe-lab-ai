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

| Phase | Features |
|-------|----------|
| v0.2 | User accounts (NextAuth/Clerk), save recipes to MongoDB collections |
| v0.3 | Scaling & Conversion, a generative component that allows the user to easily adjust quantites without complex caculations and conversions |
| v0.4 | Smart ingredient substitutions based on availability |
| v0.5 | Built-in timers, technique tips, and pro cooking advice |
| v0.6 | Meal planning and grocery list generation |
| v1.0 | Full-featured personal sous-chef experience |

## Success Metrics (MVP)

- User can paste a URL and see a parsed recipe in under 2 seconds
- Works with at least 90% of popular recipe websites
- Mobile-friendly layout scores 90+ on Lighthouse
- Clean, readable output with no missing recipe data

## Constraints

- No user data storage in MVP (stateless)
- AI costs should be minimal per request (optimize prompt size)
- Must handle recipe pages in English (multi-language is post-MVP)
