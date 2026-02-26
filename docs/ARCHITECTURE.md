# Recipe Lab AI — Technical Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI Provider | Gemini 2.5 Flash (Google GenAI) |
| Scraping Fallback | Browserless.io (hosted Chromium) |
| Database | MongoDB (post-MVP, not used yet) |
| Auth | NextAuth.js or Clerk (post-MVP) |
| Deployment | Vercel |
| Package Manager | pnpm |

## Project Structure

```
recipe-lab-ai/
├── docs/                          # Project documentation
│   ├── PRD.md                     # Product requirements
│   ├── FEATURES.md                # Feature specifications
│   ├── RELEASES.md                # Release log
│   └── ARCHITECTURE.md            # This file
├── extension/                     # Browser extension (Chrome/Edge/Arc/Brave)
│   ├── manifest.json              # MV3 manifest
│   ├── background.js              # Service worker: grabs page HTML, opens Recipe Lab
│   ├── content-script.js          # Injected into Recipe Lab tab (bridges messages)
│   ├── icons/                     # Extension icons (placeholder green squares)
│   └── README.md                  # Load instructions per browser
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Homepage entry point
│   │   ├── globals.css            # Global styles + Tailwind
│   │   └── api/
│   │       ├── parse-recipe/
│   │       │   └── route.ts       # POST /api/parse-recipe — main scrape + parse endpoint
│   │       └── map-ingredients/
│   │           └── route.ts       # POST /api/map-ingredients — step ingredient mapping
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── home-page.tsx          # Top-level page state and view management
│   │   ├── recipe-input.tsx       # URL input form
│   │   ├── recipe-card.tsx        # Parsed recipe display
│   │   ├── lab-banner.tsx         # "Enter the Lab" banner
│   │   ├── lab-view.tsx           # Full-screen cooking HUD
│   │   └── lab-complete.tsx       # Recipe complete screen
│   ├── lib/
│   │   ├── ai/
│   │   │   └── gemini.ts          # Gemini integration: extractRecipe, mapStepIngredients
│   │   ├── schema.ts              # Zod schemas for recipe validation
│   │   ├── scraper.ts             # scrapeRecipePage, scrapeWithBrowserless
│   │   └── utils.ts               # Shared utility functions
│   └── types/
│       └── recipe.ts              # TypeScript types/interfaces
├── public/
├── CLAUDE.md                      # Claude Code project guide
├── .env.example                   # Environment variable template
├── .env.local                     # Local secrets (gitignored)
├── next.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Data Flow

### Normal path (direct fetch)

```
User pastes URL
      │
      ▼
[Client] POST /api/parse-recipe { url }
      │
      ▼
[scrapeRecipePage] fetch with browser-like headers (8s timeout)
      │
      ├─ JSON-LD found → mapJsonLdToRecipe → return { type: "structured" }
      │
      └─ No JSON-LD   → extractRawContent  → return { type: "raw", content }
      │
      ▼
structured → return recipe immediately (client calls /api/map-ingredients in background)
raw        → extractWithGemini(content) → validate → return recipe
```

### Blocked path (Cloudflare 403 / timeout)

```
scrapeRecipePage throws 403 or TimeoutError
      │
      ▼
BROWSERLESS_API_KEY set?
      │
      ├─ Yes → POST https://production-sfo.browserless.io/unblock
      │         { url, content: true, gotoOptions: { waitUntil: "networkidle2" } }
      │         → returns rendered HTML after Cloudflare challenge
      │         → parseHtml(html) → same structured/raw pipeline → return recipe
      │
      └─ No  → return { blocked: true }
                → client shows "Install the extension" message
```

### Extension path (manual, last resort)

```
User clicks Recipe Lab toolbar icon on blocked site
      │
      ▼
[extension/background.js] executeScript → grab outerHTML
      │
      ▼
open localhost:3000 in background tab → sendMessage { html, url }
      │
      ▼
[extension/content-script.js] postMessage → home-page.tsx listener
      │
      ▼
POST /api/parse-html → parseHtml → extractWithGemini if needed → render
```

## Key Design Decisions

### 1. Three-Tier Scraping Waterfall

Sites like Serious Eats, AllRecipes, and NYT Cooking use Cloudflare bot protection that blocks datacenter IPs. The waterfall tries each tier in order, using progressively heavier (and costlier) tools:

1. **Direct fetch** — simple `fetch` with browser headers; works for most sites, ~300ms
2. **Browserless.io** — hosted Chromium via `/unblock` API; handles Cloudflare; triggered only on 403/429/timeout, ~5–10s
3. **Browser extension** — user's own browser; manual trigger; last resort when Browserless is unconfigured or fails

### 2. Streaming HTML Scraper with Early Abort

The direct scraper streams the response and aborts as soon as a complete `application/ld+json` Recipe block is found. Most recipe sites embed JSON-LD in the `<head>`, so only 30–50% of the HTML is downloaded. The 500KB cap prevents runaway downloads on sites that embed JSON-LD late.

### 3. Split API: Parse + Map Ingredients

`/api/parse-recipe` returns the recipe immediately. `/api/map-ingredients` (step-to-ingredient mapping) runs as a background client call and resolves ~1s later. This keeps the page load snappy while the Lab's per-step ingredient view fills in asynchronously.

### 4. AI Integration

Gemini 2.5 Flash with `thinkingBudget: 0` (no extended thinking) for fast, deterministic responses. `mapStepIngredients` uses an index-only response schema (AI returns `[[1,3],[2]]` instead of echoing full objects) — ~10x fewer output tokens.

### 5. Zod Validation

All AI responses are validated against Zod schemas. Mismatches (e.g. `stepIngredients` length mismatch) are discarded rather than crashing — the UI degrades gracefully to showing no per-step ingredients.

### 6. Stateless MVP

No database, no auth, no sessions. Purely request/response. Keeps infrastructure near-zero cost (only Gemini + Browserless API usage).

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key

# Optional — enables Browserless fallback for Cloudflare-blocked sites
BROWSERLESS_API_KEY=your-browserless-api-key
```

## Future Architecture Additions

| Phase | Addition |
|-------|----------|
| v0.6+ | MongoDB connection via Mongoose, NextAuth/Clerk integration |
| v1.0  | Saved recipes, meal planning |
| v1.1  | Background jobs for meal plan generation |
