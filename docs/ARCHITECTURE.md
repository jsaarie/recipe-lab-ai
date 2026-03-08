# Recipe Lab AI — Technical Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI Provider | Gemini 2.5 Flash (Google GenAI) |
| Scraping Fallback | Browserless.io (hosted Chromium) |
| Database | MongoDB (native driver, no Mongoose; v2.2+) |
| Auth | NextAuth.js / Auth.js v5 beta (`next-auth@5.0.0-beta.30`; v2.2+) |
| DB Adapter | `@auth/mongodb-adapter` (v2.2+) |
| MFA — TOTP | `otplib` v13 with NobleCryptoPlugin + ScureBase32Plugin (v2.2+) |
| QR Code | `qrcode` (v2.2+) |
| Password hashing | `bcryptjs`, 12 salt rounds (v2.2+) |
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
│   │   ├── layout.tsx             # Root layout (wraps with SessionProvider via providers.tsx)
│   │   ├── page.tsx               # Homepage entry point
│   │   ├── providers.tsx          # Client-side SessionProvider wrapper (v2.2)
│   │   ├── globals.css            # Global styles + Tailwind
│   │   ├── (auth)/                # Auth route group (v2.2) — centered card layout
│   │   │   ├── layout.tsx         # Centered auth shell layout
│   │   │   ├── login/page.tsx     # /login — LoginForm
│   │   │   ├── register/page.tsx  # /register — RegisterForm
│   │   │   └── verify-mfa/page.tsx # /verify-mfa — TOTP challenge page
│   │   ├── (protected)/           # Protected route group (v2.2)
│   │   │   ├── profile/page.tsx   # /profile — ProfileForm + MfaSetup (server component)
│   │   │   └── library/page.tsx   # /library — saved recipe listing (v2.3)
│   │   └── api/
│   │       ├── parse-recipe/
│   │       │   └── route.ts       # POST /api/parse-recipe — main scrape + parse endpoint
│   │       ├── map-ingredients/
│   │       │   └── route.ts       # POST /api/map-ingredients — step ingredient mapping
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts  # NextAuth.js handler (v2.2)
│   │       │   └── register/route.ts       # POST /api/auth/register (v2.2)
│   │       ├── library/
│   │       │   ├── route.ts               # GET + POST /api/library (v2.3)
│   │       │   └── [id]/route.ts          # GET + DELETE /api/library/[id] (v2.3)
│   │       └── user/
│   │           ├── profile/route.ts        # GET + PATCH /api/user/profile (v2.2)
│   │           └── mfa/
│   │               ├── setup/route.ts      # POST /api/user/mfa/setup (v2.2)
│   │               └── verify/route.ts     # POST /api/user/mfa/verify (v2.2)
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── auth/                  # Auth components (v2.2)
│   │   │   ├── login-form.tsx     # Email + password sign-in form
│   │   │   ├── register-form.tsx  # Registration form (name, email, password + confirm)
│   │   │   ├── profile-form.tsx   # Profile settings form (name, unit system, servings)
│   │   │   ├── mfa-setup.tsx      # TOTP enrolment (QR scan → 6-digit confirm)
│   │   │   └── user-nav.tsx       # Header nav: avatar/initials dropdown or sign in/sign up links
│   │   ├── home-page.tsx          # Top-level page state and view management
│   │   ├── recipe-input.tsx       # URL input form
│   │   ├── recipe-card.tsx        # Parsed recipe display + v2.1 editor UI
│   │   ├── lab-banner.tsx         # "Enter the Lab" banner
│   │   ├── lab-view.tsx           # Full-screen cooking HUD (receives derived editor state)
│   │   └── lab-complete.tsx       # Recipe complete screen
│   ├── lib/
│   │   ├── ai/
│   │   │   └── gemini.ts          # Gemini integration: extractRecipe, mapStepIngredients
│   │   ├── schema.ts              # Zod schemas for recipe validation
│   │   ├── scraper.ts             # scrapeRecipePage, scrapeWithBrowserless
│   │   ├── db.ts                  # v2.2: lazy MongoClient proxy (dev-cached, prod-fresh)
│   │   ├── auth-utils.ts          # v2.2: hashPassword + verifyPassword (bcryptjs, 12 rounds)
│   │   ├── use-recipe-editor.ts   # v2.1: client-side editor hook (scaling/swaps/conversion)
│   │   ├── conversions.ts         # v2.1: US↔Metric unit conversion + F↔C temperature
│   │   ├── density.ts             # v2.1: ingredient density lookup (~100 entries, g/cup)
│   │   ├── fractions.ts           # v2.1: parseQuantity + formatQuantity (Unicode fractions)
│   │   └── utils.ts               # Shared utility functions
│   ├── auth.ts                    # v2.2: NextAuth config (credentials provider, JWT strategy, callbacks)
│   ├── proxy.ts                   # v2.2: Next.js middleware (route protection + MFA redirect)
│   └── types/
│       ├── recipe.ts              # TypeScript types/interfaces
│       └── next-auth.d.ts         # v2.2: Session/JWT type augmentation (id, mfaEnabled, etc.)
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

### v2.1 Recipe Editor data flow (client-side only)

```
ParsedRecipe (from API, stored in home-page.tsx state)
      │
      ▼
RecipeView (mounts useRecipeEditor once — persists across recipe/lab/complete views)
      │
      ├── servings (number)            ← user-controlled via ServingScaler
      ├── ingredientOverrides (Map)    ← quantity edits + ingredient swaps
      ├── unitSystem ('us'|'metric')   ← user-controlled via UnitToggle
      │
      ▼
derivedIngredients (useMemo — scaling + conversion + overrides applied)
derivedInstructions (useMemo — F↔C applied to instruction text when metric)
      │
      ├── RecipeCard receives derivedIngredients + derivedInstructions → renders editor UI
      └── LabView receives derivedIngredients + derivedInstructions → renders cooking HUD
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

### 7. v2.1 Client-Side Editor (no backend changes)

All recipe editing lives in React state via `useRecipeEditor`. No API calls are added in v2.1. The hook is mounted once in `RecipeView` (an inner component of `home-page.tsx`) so editor state persists when the user switches between the recipe card view, Lab HUD, and completion screen.

- **Scaling**: `derivedIngredients` is a `useMemo` that multiplies each quantity by `servings / originalServings`. Manual quantity overrides are excluded from scaling (they pin their value).
- **Swaps**: `ingredientOverrides` is a `Map<number, IngredientOverride>` keyed by ingredient index. Swapped items are displayed with a "(swapped)" indicator and a clear button.
- **Conversions**: `convertUnit()` handles US↔Metric volume and weight. For Weight↔Volume, `applyConversion()` first attempts density-based weight conversion via `volumeToGrams()` (`density.ts`) before falling back to direct volume conversion — ensuring ingredients with a known density (e.g. flour) convert to grams rather than millilitres. Temperature conversion (`convertTemperatures()`) replaces °F/°C patterns in instruction strings.
- **Fractions**: `formatQuantity()` snaps decimal results to the nearest eighth (with special-casing for thirds and sixths) and renders Unicode fraction characters (½, ¼, ¾, ⅓, ⅔, ⅛, ⅜, ⅝, ⅞). Metric quantities use `formatMetricQuantity()` (added in v2.1.1) which rounds to one decimal place instead.

### 8. v2.1.1 Patch — Architectural Changes (2026-02-25)

The following changes were made as part of the v2.1.1 bug-fix patch:

| Change | Location | Description |
|--------|----------|-------------|
| Density path now runs first | `use-recipe-editor.ts:applyConversion` | `applyConversion` now attempts density-based weight conversion (`volumeToGrams`) before falling through to direct volume conversion on the metric path. Previously, `convertUnit` always succeeded for standard US volume units and returned early, making the density block unreachable. |
| `formatMetricQuantity` added | `fractions.ts` | New formatter for metric quantities that rounds to one decimal place instead of snapping to Unicode fractions. Used by the metric display path in place of `formatQuantity`. |
| Index-based fallback matching in Lab HUD | `lab-view.tsx` | `patchedStepIngredients` now falls back to ingredient index matching when name matching fails. This ensures swapped ingredients (whose `derived.item` differs from the original `si.item`) are correctly resolved in per-step ingredient lists. |
| Pre-snap removed from Lab HUD split quantities | `lab-view.tsx` | The `Math.round(scaledQty * 8) / 8` pre-snap that ran before `formatQuantity` has been removed. `scaledQty` is now passed directly to `formatQuantity`, allowing thirds and sixths snapping to work correctly on split-step quantities. |

The five issues documented in the original v2.1 "Known Limitations" table (unicode fraction misparsing, thirds snap, `ML_PER_UNIT` partial duplicate, stale `qtyDraft`, `parseFloat` in Lab ratio calc) were resolved in the earlier v2.1 patch. All issues listed in `docs/FEEDBACK.md` issues #1–12 are resolved as of v2.1.1.

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key

# Required for v2.2+ (auth + profiles)
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas connection string
AUTH_SECRET=your-nextauth-secret       # Random secret for JWT signing (generate with: openssl rand -base64 32)

# Optional — enables Browserless fallback for Cloudflare-blocked sites
BROWSERLESS_API_KEY=your-browserless-api-key
```

## Future Architecture Additions

| Phase | Addition |
|-------|----------|
| v2.1.1 patch | Fixed: density conversion path now takes priority over direct volume conversion; `formatMetricQuantity` added to `fractions.ts`; Lab HUD uses index-based fallback for swapped ingredient matching; Lab HUD pre-snap removed from split quantities. All 12 open feedback issues resolved. |
| v2.2 | Shipped — see v2.2 Auth Layer section below. |
| v2.3 | **In Progress** — `savedRecipes` collection, `/api/library` CRUD routes (POST/GET/[id] GET/[id] DELETE), `/library` page; `ingredientOverrides` Map serialized to plain object for MongoDB persistence |
| v2.4 | Full-text search on saved recipes (MongoDB Atlas Search or client-side filter), recipe editing endpoints |
| v3.0 | AI ingredient substitution endpoint (Gemini call per swap suggestion) |
| v3.1+ | Background jobs for meal plan generation |

## V2.x State Architecture

### v2.1 — Client-side recipe state

All recipe editing (scaling, swaps, conversions) lives in React state on the recipe card component. No API calls — purely derived from the parsed recipe data.

```
ParsedRecipe (from API)
      │
      ▼
useRecipeEditor hook
  ├── servings (number)           ← user-controlled
  ├── ingredientOverrides (map)   ← quantity edits + swaps
  ├── unitSystem ('us' | 'metric')
  ├── derivedIngredients          ← computed: scaled + swapped + converted
  └── derivedInstructions         ← computed: F↔C applied to instruction text
```

Key files:
- `src/lib/use-recipe-editor.ts` — hook, `applyConversion()`, `parseServings()`
- `src/lib/conversions.ts` — `convertUnit()`, `convertTemperatures()`, `fToC()`, `cToF()`
- `src/lib/density.ts` — `getDensityGPerCup()`, `volumeToGrams()`, `gramsToVolume()` (~100 ingredients)
- `src/lib/fractions.ts` — `parseQuantity()`, `formatQuantity()`, `formatMetricQuantity()` (v2.1.1)

Fractions are rendered using a small utility that converts decimals to Unicode fractions (½, ¼, ¾, ⅓, ⅔, ⅛, ⅜, ⅝, ⅞) by snapping to the nearest eighth (with special cases for thirds and sixths). Metric quantities use `formatMetricQuantity()` (added in v2.1.1), which rounds to one decimal place instead of snapping to fractions.

Weight ↔ Volume conversion uses a static density lookup table (`src/lib/density.ts`) covering ~100 common baking/cooking ingredients. `applyConversion` attempts density-based weight conversion first; if the ingredient is not in the table, it falls back to direct volume conversion. Items not in the table and with no volume fallback are returned unchanged.

### v2.2 — Auth layer (Shipped)

NextAuth.js v5 beta (`next-auth@5.0.0-beta.30`) with:
- **Credentials provider** — email + password login; bcryptjs hash verification (12 rounds)
- **JWT session strategy** — `strategy: "jwt"`; no server-side session table; token holds `id`, `mfaEnabled`, `mfaVerified`, `defaultUnitSystem`, `preferredServings`
- **MongoDB adapter** — `@auth/mongodb-adapter`; persists user documents to `users` collection in MongoDB Atlas
- **Custom `jwt` callback** — copies user fields from the `authorize` return value into the token on first sign-in
- **Custom `session` callback** — copies token fields into `session.user` so they are available client-side
- **TypeScript augmentation** — `src/types/next-auth.d.ts` extends `Session["user"]` and `JWT` with the custom fields
- **TOTP MFA** — `otplib` v13 (NobleCryptoPlugin + ScureBase32Plugin); two-step enrolment (setup → verify); login challenge enforced by middleware
- **Middleware** (`src/proxy.ts`) — Next.js edge middleware that guards `/profile` and enforces the MFA challenge redirect
- **Lazy MongoDB proxy** (`src/lib/db.ts`) — `MongoClient` is not instantiated at import time; deferred until first method call so the build passes without `MONGODB_URI`. In development, the client is cached on `global._mongoClient` to survive HMR reloads.

**Not implemented in v2.2 (deferred):**
- Email OTP / magic link (`emailVerified` auto-set at registration as a placeholder)
- SMS OTP (Twilio)
- Avatar uploads
- Password change endpoint

### v2.3 — Database layer (planned)

MongoDB Atlas (free tier) using the native MongoDB driver (no Mongoose). Two collections at launch:
- `users` — created and managed by NextAuth.js MongoDB adapter (v2.2+)
- `savedRecipes` — see SavedRecipe data model in FEATURES.md

API routes added:
- `POST /api/library` — save a recipe
- `GET /api/library` — list saved recipes for the current user
- `GET /api/library/[id]` — fetch a single saved recipe
- `DELETE /api/library/[id]` — delete a saved recipe
- `PATCH /api/library/[id]` — update a saved recipe (v2.4)
