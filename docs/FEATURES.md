# Recipe Lab AI — MVP Feature Specification

## Feature: Recipe URL Parser

### Overview

The core (and only) MVP feature. A user pastes a recipe URL into an input field, the app fetches and parses the page content, sends it to an AI provider for structured extraction, and displays the result in a clean, readable format.

---

### User Flow

```
1. User lands on homepage
2. User pastes a recipe URL into the input field
3. User clicks "Extract Recipe" (or presses Enter)
4. Loading state displays while processing
5. Parsed recipe appears in a clean, structured card layout
6. User can read/follow the recipe on any device
```

### UI Components

#### 1. Hero / URL Input Section

- Headline: "Paste any recipe URL. Get a clean recipe."
- Subtext: Brief description of what the app does
- Input field: Full-width URL input with placeholder text
- Submit button: "Extract Recipe" with loading spinner state
- Error display: Inline error messages for invalid URLs or parse failures

#### 2. Recipe Display Card

Once parsed, the recipe renders in a structured card with these sections:

| Section | Description |
|---------|-------------|
| **Title** | Recipe name, large and prominent |
| **Source** | Link back to the original recipe URL |
| **Meta** | Prep time, cook time, total time, servings — displayed as pills/badges |
| **Ingredients** | Bulleted list, each ingredient on its own line. Quantities bolded. |
| **Instructions** | Numbered steps, each in its own block with comfortable spacing |
| **Notes** | Optional section for tips, variations, or storage instructions |

#### 3. States

- **Empty**: Just the hero + input (landing state)
- **Loading**: Skeleton/shimmer of the recipe card + spinner on button
- **Success**: Full recipe card rendered
- **Error**: Inline error message with option to retry
- **Invalid URL**: Validation message before submission

---

### API Design

#### `POST /api/parse-recipe`

**Request:**
```json
{
  "url": "https://example.com/best-chocolate-chip-cookies"
}
```

**Response (success):**
```json
{
  "success": true,
  "recipe": {
    "title": "Best Chocolate Chip Cookies",
    "source": "https://example.com/best-chocolate-chip-cookies",
    "prepTime": "15 minutes",
    "cookTime": "12 minutes",
    "totalTime": "27 minutes",
    "servings": "24 cookies",
    "ingredients": [
      { "quantity": "2 1/4", "unit": "cups", "item": "all-purpose flour" },
      { "quantity": "1", "unit": "tsp", "item": "baking soda" }
    ],
    "instructions": [
      "Preheat oven to 375°F (190°C).",
      "Combine flour, baking soda, and salt in a bowl.",
      "Beat butter, sugars, and vanilla until creamy."
    ],
    "notes": "Store in an airtight container for up to 5 days."
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Could not extract a recipe from this URL. Please ensure it links to a recipe page."
}
```

---

### AI Integration

#### Provider Abstraction

The AI layer is abstracted behind a common interface so providers can be swapped:

```typescript
async function extractRecipe(
  pageContent: string,
  sourceUrl: string
): Promise<ParsedRecipe>
```

**Primary provider:**
- Gemini 2.5 Flash (Google GenAI)

#### Parsing Strategy

1. Fetch the URL server-side (avoid CORS issues)
2. Extract the main content / strip HTML boilerplate
3. Send cleaned text to the AI provider with a structured prompt
4. AI returns JSON matching the `ParsedRecipe` schema
5. Validate the response and return to the client

---

### Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid URL format | Client-side validation before submission |
| URL returns 404 or is unreachable | Return error: "Could not reach this URL" |
| Page exists but has no recipe | AI returns indication; show: "No recipe found on this page" |
| AI response doesn't match schema | Fallback: display raw extracted text with a warning |
| Rate limiting / AI API errors | Return error: "Service temporarily unavailable, try again" |
| Very long recipe page | Truncate content to fit AI context window |

---

### Non-Functional Requirements

- **Performance**: Recipe should parse and display within 2 seconds
- **Mobile-first**: Fully responsive, optimized for phone use in a kitchen
- **Accessibility**: Semantic HTML, proper heading hierarchy, sufficient contrast
- **SEO**: Not a priority for MVP (single-page app, no public recipe pages)

---

## Feature: Smart Ingredients (v0.4)

### Overview

Per-step ingredient display inside the Lab HUD. As the user advances through cooking steps, only the ingredients relevant to the current step are shown — with split quantities when an ingredient is used across multiple steps. Ingredients are checkable so users can track what they've prepped.

---

### Design Decisions

| Decision | Choice |
|----------|--------|
| Placement | Per-step, inline below the instruction text |
| Ingredient-to-step mapping | AI extraction (at parse time) |
| Checkable | Yes — tap to mark as used, state persists across steps |
| Quantity handling | AI splits amounts per step (e.g. "1 of 2 cups flour") |
| Empty steps | Hide ingredients section entirely (e.g. "Preheat oven") |

---

### Data Model

The `ParsedRecipe` type is extended with a `stepIngredients` field — an array parallel to `instructions`, where each entry contains the ingredients used in that step with split quantities.

```typescript
interface ParsedRecipe {
  // ... existing fields ...
  stepIngredients: {
    quantity: string;
    unit: string;
    item: string;
  }[][];
  // stepIngredients[0] = ingredients for instructions[0]
  // stepIngredients[3] = [] means step 4 uses no ingredients
}
```

---

### AI Extraction

The extraction prompt is extended (single AI call, not a second pass) to also return `stepIngredients`. The AI:

1. Parses the full ingredient list as before
2. Maps each ingredient to the step(s) where it is used
3. Splits quantities when an ingredient appears in multiple steps
4. Returns `stepIngredients` as a parallel array to `instructions`

---

### Lab HUD Integration

#### Per-step ingredient list

Below the instruction text on each step, a list of ingredients appears:

```
┌─────────────────────────────────┐
│  Combine flour and baking soda  │  ← instruction
│  in a large bowl.               │
│                                 │
│  ☐ 1½ cups all-purpose flour    │  ← checkable ingredients
│  ☐ 1 tsp baking soda           │
│                                 │
│  Step 2 of 8                    │  ← step label
│  ████████░░░░░░░░░░░░░░░░░░░░  │  ← progress bar
└─────────────────────────────────┘
```

- Ingredients are shown as checkable rows (tap to toggle)
- Checked state persists when navigating between steps
- On steps with no ingredients, the section is hidden entirely

---

## Feature: Recipe Editing — Scaling, Swapping & Conversion (v2.1)

### Overview

Session-based recipe personalization tools available to all users (no account required). All adjustments live in client state and reset on page refresh. When a logged-in user later saves a recipe, their active adjustments are persisted with the saved copy.
---

### Implementation Status: Shipped (Feb 2026)

The editor is built entirely on the client — no additional API routes required. Key files:

| File | Role |
|------|------|
| `src/lib/use-recipe-editor.ts` | `useRecipeEditor` hook — holds all editor state and derives computed ingredient/instruction lists |
| `src/lib/conversions.ts` | `convertUnit()` (US/Metric volume/weight), `convertTemperatures()` (F/C in instruction text) |
| `src/lib/density.ts` | `getDensityGPerCup()` density lookup (~100 ingredients); `volumeToGrams()` / `gramsToVolume()` |
| `src/lib/fractions.ts` | `parseQuantity()` (string to decimal), `formatQuantity()` (decimal to Unicode fraction string) |
| `src/components/recipe-card.tsx` | `ServingScaler`, `UnitToggle`, `IngredientRow` components; `RecipeCardEditorProps` interface |
| `src/components/home-page.tsx` | Mounts `useRecipeEditor` in `RecipeView`; passes `editor` props to `RecipeCard` and derived state to `LabView` |

### Bug Fixes (v2.1.1 patch — 2026-02-25)

- **Unit conversion input interpreted in original unit** — `applyConversion` now carries the converted unit into the override so quantity edits are interpreted in the displayed metric unit, not the original US unit.
- **Lab HUD name matching fails on minor variations** — step ingredient matching now normalises hyphens and collapses extra whitespace before comparison.
- **Swapped ingredients not shown in Lab HUD steps** — `patchedStepIngredients` falls back to index-based lookup when name matching fails, correctly resolving post-swap ingredient names.
- **Density conversion path was dead code** — `applyConversion` now tries density-based weight conversion before direct volume conversion on the metric path; "1 cup flour" now converts to 120 g instead of 237 ml.
- **No-op quantity commit created a silent pin** — `commitQty` skips `onQuantityChange` when the draft is unchanged, preventing unintentional quantity overrides.
- **Metric quantities displayed as Unicode fractions** — added `formatMetricQuantity` to `fractions.ts`; metric quantities now render as decimals rounded to one decimal place.
- **Lab HUD pre-snap bypassed thirds/sixths formatting** — pre-snap `Math.round(scaledQty * 8) / 8` removed from `lab-view.tsx`; `scaledQty` is passed directly to `formatQuantity`.
- **Range-style servings strings silently truncated** — `parseServings` now detects range strings (e.g. "12–16 cookies") and shows the full range in the scaler UI.
- **Reset action had no confirmation** — a toast with an "Undo" action now appears for 4 seconds after Reset is triggered.
- **No-op ingredient swap showed swapped indicator** — swap state is only applied when the submitted value differs from the original ingredient name.
- **Unitless count ingredients did not scale** — scaling path now detects unitless count ingredients and applies the scale factor directly to the quantity.
- **Swapped ingredient names not shown in Lab HUD list** — active swaps map is now passed into the Lab ingredient list resolver.


---

### Serving Size Scaling

User changes the serving count from the recipe card. All ingredient quantities auto-recalculate proportionally.

**Behavior:**
- Original serving count shown as the baseline (e.g. "4 servings")
- User can increment/decrement or type a new count
- All `quantity` values in the ingredient list are multiplied by `(newServings / originalServings)`
- Fractional results are rounded to the nearest sensible fraction (e.g. 0.667 → ⅔)
- The scaled serving count is shown in the recipe meta bar

---

### Ingredient Quantity Editing

User can tap any ingredient quantity to edit it directly.

**Behavior:**
- Inline editable field on the quantity portion of each ingredient row
- Changes do not affect other ingredients (independent of scaling)
- Edited quantities are preserved through serving size re-scales (the edited value becomes the new baseline for that ingredient)

---

### Ingredient Swapping

User can swap any ingredient for a different one.

**Behavior:**
- Each ingredient row has a swap action (e.g. a swap icon or context menu)
- Tapping it opens a small inline editor with the current item pre-filled
- User types the replacement ingredient name (free-text)
- The ingredient row updates in place with the new name; quantity and unit are preserved
- A visual indicator marks swapped ingredients so the user can see their modifications at a glance

**v3.0 upgrade path:** AI-suggested substitutes with ratio adjustments replace the free-text input.

---

### Measurement Conversion

User can toggle unit systems app-wide for the current recipe.

**Supported conversions:**
| Type | Example |
|------|---------|
| US ↔ Metric | 1 cup → 240 ml, 1 oz → 28g, 1 lb → 454g |
| Weight ↔ Volume | 1 cup flour → 120g (density lookup per ingredient) |
| Temperature | 350°F → 175°C (in instruction text and meta) |

**Design decisions:**
- A toggle in the recipe card header switches between US and Metric globally for that recipe
- Temperature conversions apply to both the meta bar (if oven temp is listed) and inline within instruction text
- Weight ↔ Volume requires a static density lookup table for common baking/cooking ingredients; items not in the table fall back to displaying only volume or weight as available
- Fractions are displayed as Unicode fraction characters (½, ¼, ¾) rather than decimals where possible

---

## Feature: Accounts & Profiles (v2.2) — Shipped Feb 2026

### Overview

User authentication and profile management using NextAuth.js (Auth.js v5 beta). This release ships the auth foundation that v2.3 and v2.4 depend on.

---

### Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Email + password registration | Shipped | `POST /api/auth/register`; Zod-validated |
| Password hashing | Shipped | bcryptjs, 12 salt rounds |
| Login | Shipped | NextAuth.js credentials provider; `/login` page |
| JWT sessions | Shipped | `strategy: "jwt"`; custom fields propagated via `jwt` + `session` callbacks |
| MongoDB user persistence | Shipped | `@auth/mongodb-adapter`; lazy proxy client (`src/lib/db.ts`) |
| TOTP MFA | Shipped | `otplib` v13; QR enrolment at `/profile`; challenge at `/verify-mfa` |
| Protected routes | Shipped | Next.js middleware (`src/proxy.ts`) guards `/profile` and enforces MFA challenge |
| Profile page | Shipped | `/profile` — display name, default unit system, preferred servings |
| User nav | Shipped | `UserNav` component — initials avatar, dropdown with Profile + Sign out |
| Email OTP | Not shipped | Deferred; `emailVerified` auto-set at registration as a placeholder |
| SMS OTP | Not shipped | Deferred indefinitely |
| Avatar upload | Not shipped | No image upload; initials fallback rendered client-side |
| Change password | Not shipped | No password change endpoint in this release |

---

### User Registration

- `POST /api/auth/register` accepts `{ name, email, password }`
- Zod validation: name (1–100 chars), valid email, password (min 8 chars, at least one uppercase, lowercase, and digit)
- Passwords stored as bcryptjs hashes with 12 salt rounds
- Duplicate email check returns HTTP 409
- `emailVerified` is set to the current timestamp at registration (no real email verification flow yet — deferred to a future patch)
- New user document fields: `name`, `email`, `password`, `emailVerified`, `mfaEnabled: false`, `defaultUnitSystem: "us"`, `preferredServings: null`, `createdAt`, `updatedAt`

---

### Login

- NextAuth.js Credentials provider at `/login`
- `authorize` callback: validates schema with Zod, looks up user in `users` collection, rejects if `emailVerified` is null/unset, verifies bcrypt hash
- On success, returns user object including `mfaEnabled`, `defaultUnitSystem`, `preferredServings`
- These fields are propagated into the JWT token and then into the session object via the `jwt` and `session` callbacks in `src/auth.ts`

---

### MFA — TOTP Only

Multi-factor authentication is optional and can be enabled from the profile page after login.

**Supported second factors:**

| Method | Library/Provider | Status |
|--------|-----------------|--------|
| TOTP (authenticator app) | `otplib` v13 — compatible with Google Authenticator, Authy, 1Password | Shipped |
| Email OTP | — | Not shipped |
| SMS OTP | — | Not shipped |

**Enrolment flow (`/profile` → MfaSetup component):**
1. User clicks "Enable authenticator app"
2. `POST /api/user/mfa/setup` generates a TOTP secret via `otplib`, stores it as `mfaPendingSecret` in the user document, returns a QR code data URL (via `qrcode` package)
3. User scans the QR code in their authenticator app
4. User enters the 6-digit code; `POST /api/user/mfa/verify` with `{ token, mode: "setup" }` verifies against `mfaPendingSecret`
5. On success: `mfaEnabled: true`, `mfaSecret` set, `mfaPendingSecret` removed

**Login challenge flow:**
1. User logs in with email + password
2. JWT callback sets `mfaVerified: false` when `mfaEnabled: true`
3. Middleware (`src/proxy.ts`) redirects to `/verify-mfa` if `mfaEnabled && !mfaVerified`
4. `/verify-mfa` page calls `POST /api/user/mfa/verify` with `{ token, mode: "login" }` against the active `mfaSecret`
5. On success: session updated via `useSession().update({ mfaVerified: true })`; user redirected to `/`

---

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/register` | POST | None | Create a new user account |
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth.js handler (sign in, sign out, session) |
| `/api/user/profile` | GET | Required | Fetch current user's profile (excludes password, mfaSecret) |
| `/api/user/profile` | PATCH | Required | Update name, defaultUnitSystem, preferredServings |
| `/api/user/mfa/setup` | POST | Required | Generate TOTP secret + QR code, store as pending |
| `/api/user/mfa/verify` | POST | Required | Verify TOTP code (mode: "setup" to activate, mode: "login" for session challenge) |

---

### User Profile

A settings page at `/profile` (protected route), accessible from the user nav dropdown.

**Profile fields implemented:**

| Field | Editable | Notes |
|-------|----------|-------|
| Display name | Yes | Shown in nav dropdown |
| Email | Read-only | Displayed but not changeable in this release |
| Default unit system | Yes | "US" or "Metric" toggle |
| Preferred serving size | Yes | Integer 1–100; blank = use recipe default |
| Avatar / profile image | No | Initials rendered from display name |

**Profile page sections:**
- Account (display name, email read-only)
- Preferences (default unit system, preferred serving size)
- Security (TOTP authenticator app enrolment/status)

---

### Middleware & Route Protection

`src/proxy.ts` (the Next.js middleware file, exported as `default` and `config`):
- Redirects unauthenticated users away from `/profile` → `/login?callbackUrl=/profile`
- Redirects users with `mfaEnabled && !mfaVerified` to `/verify-mfa` (except on `/verify-mfa` itself)
- Excludes Next.js internals, static files, and public API routes from matching

---

### MongoDB Client

`src/lib/db.ts` exports a lazy proxy `MongoClient`:
- In development: cached on `global._mongoClient` to survive hot reloads
- In production: a new `MongoClient` is created per cold start (Vercel serverless compatible)
- The proxy defers connection until the first method call, so builds succeed without `MONGODB_URI` configured
- Requires `MONGODB_URI` environment variable at runtime

---

## Feature: Save & Access Recipes (v2.3)

### Overview

Logged-in users can save parsed recipes to a personal library. The saved copy captures their current adjustments (scaling, swaps, unit preferences). Requires MongoDB.

---

### Save a Recipe

- "Save Recipe" button appears on the recipe card when a user is logged in
- Saves the current recipe state including:
  - Original parsed recipe data
  - Active serving size (if changed from original)
  - Any ingredient swaps made
  - User's preferred unit system at time of save
- Duplicate detection: if the user already saved the same source URL, prompt to overwrite or save as a copy

---

### Recipe Library Page

Dedicated `/library` route listing all saved recipes.

**Each library entry shows:**
- Recipe title
- Thumbnail (if available from original page)
- Source site name
- Date saved
- Saved serving size

---

### Open a Saved Recipe

- Clicking a library entry loads the recipe into the full recipe card view
- Restores the saved scaling and swap state
- User can enter The Lab directly from a saved recipe

---

### Data Model

```typescript
interface SavedRecipe {
  id: string;
  userId: string;
  savedAt: Date;
  recipe: ParsedRecipe;           // full recipe snapshot at save time
  servings: number;               // user's preferred serving size
  ingredientSwaps: {              // keyed by ingredient index
    [index: number]: string;      // replacement item name
  };
  unitSystem: 'us' | 'metric';
  tags: string[];                 // user-applied tags (v2.4)
  notes: string;                  // user's personal notes (v2.4)
}
```

---

## Feature: Recipe Library Management (v2.4)

### Overview

Power tools for managing a saved recipe collection. Builds on the library scaffold from v2.3.

---

### Search & Filter

- Search bar on the library page filters results in real time
- Searchable fields: recipe title, source site, ingredient names
- Filter chips for user-applied tags

---

### Edit Saved Recipe Details

Users can edit their saved copy of a recipe without affecting the original source.

**Editable fields:**
- Recipe title (rename)
- Personal notes (free-text note attached to the recipe)
- Ingredients (quantity, unit, item name for any row)
- Instructions (edit or reorder steps)
- Tags (add/remove)

Changes save back to MongoDB immediately (optimistic UI update).

---

### Delete Recipe

- Delete action on each library card and on the recipe detail view
- Confirmation prompt before deletion
- Soft-delete with 30-day recovery window (restore from trash) — optional, can ship as hard delete first

---

## Feature: Cookbook Digitization (v3.0)

### Overview

Users photograph printed cookbook pages and the app digitizes them into the standard recipe format using Gemini Vision. Digitized recipes land in the personal library alongside URL-sourced recipes, with full support for scaling, swaps, and The Lab.

---

### User Flow

```
1. User taps "Add from Cookbook" on the library page
2. User photographs or uploads a cookbook page (photo 1)
3. Optional: user taps "Add another page" to upload a second photo (for recipes that span two pages)
4. User taps "Extract Recipe" — both images are sent in a single Gemini Vision call
5. Extracted recipe appears in a pre-save review screen (editable card)
6. User reviews, corrects any extraction errors, and taps "Save to Library"
7. Recipe is saved and appears in the library with a "Digitized" badge
```

---

### Input Methods

| Method | Notes |
|--------|-------|
| Camera capture (mobile) | `<input type="file" accept="image/*" capture="environment">` — opens native camera |
| File upload (photo) | JPEG, PNG, HEIC from camera roll or file system |
| Multi-photo (2 max) | Sequential: photo 1 → optional "Add another page" → photo 2 |

**v3.0 scope:** Printed cookbook pages only. Handwriting support (recipe cards, margin notes) is deferred to v3.1.

---

### Upload UI Flow

**Step 1 — Photo 1:**
- Large camera/upload button with label "Photograph a cookbook page"
- Thumbnail preview shown after selection with a "Retake" option
- "Add another page" button appears below the preview

**Step 2 — Photo 2 (optional):**
- Same camera/upload button, same retake option
- "Remove second page" link to go back to single-photo mode

**Step 3 — Submit:**
- "Extract Recipe" button; disabled until at least one photo is selected
- Loading state while Gemini processes (can take 5–10s for two images)

---

### AI Extraction

Uses the existing Gemini 2.5 Flash model with its native multimodal (vision) capability — no new AI provider required.

**New API route:** `POST /api/parse-image`

- Accepts `multipart/form-data` with 1–2 image files
- Images are converted to base64 and included as `inlineData` parts in the Gemini request
- The extraction prompt instructs Gemini to treat all images as pages of a single recipe
- Returns the same `ParsedRecipe` JSON shape as `/api/parse-recipe`
- Validated with the same Zod schema
- Images are discarded server-side after extraction — not stored

**Request shape:**
```
POST /api/parse-image
Content-Type: multipart/form-data

page1: <image file>
page2: <image file>   (optional)
```

**Response:** identical to `/api/parse-recipe` — `{ success, recipe }` or `{ success: false, error }`.

**File limits:**
- Max 2 images per request
- Max 10 MB per image (enforced on client and server)
- Accepted MIME types: `image/jpeg`, `image/png`, `image/heic`, `image/webp`

---

### Pre-Save Review Screen

Before saving, the extracted recipe is shown in an editable card — identical to the v2.4 edit experience.

- All fields are editable inline (title, ingredients, steps, times, servings)
- Source field defaults to "Digitized from photo" — user can replace with cookbook name and page number
- "Retake / Replace photos" link to go back and re-shoot if extraction was badly wrong
- "Save to Library" commits the recipe; "Discard" exits without saving

---

### Data Model Extension

```typescript
interface SavedRecipe {
  // ... existing v2.3/v2.4 fields ...
  source: 'url' | 'digitized';    // new field — 'url' for existing recipes
  cookbookName?: string;           // user-entered at review (e.g. "Plenty")
  cookbookPage?: string;           // user-entered at review (e.g. "p. 142")
}
```

The `source` field defaults to `'url'` for all recipes saved before v3.0.

---

### Library Integration

- Digitized recipes show a camera icon badge in the library card (instead of a source domain pill)
- Filter chip added to the library page: "All" / "From Web" / "From Cookbooks"
- No other library UI changes required

---

### Dependencies

- Requires v2.3 (library save) and v2.4 (edit saved recipes) to be shipped first
- Gemini multimodal: already supported by the existing `GEMINI_API_KEY` — no new credentials

---

### Out of Scope for v3.0

| Feature | Deferred to |
|---------|-------------|
| Handwriting / recipe card support | v3.1 |
| Batch import (multiple recipes at once) | v3.1 |
| Storing original cookbook photos | Not planned |
| PDF upload | v3.1 |
| Cookbook organisation (group by book) | v3.x |

---

## Feature: Scraper Waterfall & Bot Protection Bypass (v0.5)

### Overview

Major recipe sites (Serious Eats, AllRecipes, NYT Cooking, Food Network) use Cloudflare bot protection that blocks server-side IPs. A three-tier waterfall handles these sites transparently without requiring any action from most users.

---

### Scraping Tiers

| Tier | Method | Cost | Latency | Coverage |
|------|--------|------|---------|----------|
| 1 | Direct `fetch` with browser headers | Free | ~300ms | ~70% of sites |
| 2 | Browserless.io `/unblock` | Free tier: 1,000 units/month | 5–10s | Cloudflare-protected sites |
| 3 | Browser extension (manual) | Free | User-initiated | Any site the user can open |

Tier 2 is only triggered when Tier 1 returns 403, 429, 407, or times out. Tier 3 is shown as a prompt only when both Tier 1 and Tier 2 fail.

---

### Browserless Integration

When a blocked error is detected and `BROWSERLESS_API_KEY` is set, the server calls:

```
POST https://production-sfo.browserless.io/unblock?token=KEY
{ url, content: true, gotoOptions: { waitUntil: "networkidle2" } }
```

Browserless runs a real Chromium, completes the Cloudflare JS challenge, and returns the fully rendered HTML. The existing scraper pipeline (`parseHtml → tryExtractStructured → extractRawContent`) handles it from there.

---

### Browser Extension

A Manifest V3 extension lives in `extension/`. When the toolbar button is clicked:

1. Grabs the current tab's `outerHTML` via `chrome.scripting.executeScript`
2. Opens `localhost:3000` (configurable) in a background tab
3. Sends the HTML via `chrome.tabs.sendMessage` → `content-script.js` → `window.postMessage`
4. `home-page.tsx` listener receives it and calls `/api/parse-html`

Load instructions: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`.

---

### Error States

| Scenario | Response |
|----------|----------|
| 403/429 + Browserless configured | Transparent retry via Browserless; user sees normal recipe |
| 403/429 + no Browserless key | `{ blocked: true }` → client shows extension prompt |
| Browserless also fails | Falls through to `{ blocked: true }` → extension prompt |
| Network unreachable (404, DNS) | "Could not reach that URL. Check the link and try again." |

---

## Feature: Step Timers (v0.3)

### Overview

Auto-detected countdown timers inside the Lab HUD. When a step mentions a duration (e.g. "bake for 25 minutes"), a timer widget appears below the instruction. Users tap to start the countdown and can navigate freely while timers run in the background. A toast notification with sound alerts the user when any timer finishes.

---

### Design Decisions

| Decision | Choice |
|----------|--------|
| Trigger | Auto-detected from instruction text |
| Extraction | Client-side regex (no AI cost, works with all recipes) |
| Concurrency | Multiple timers can run simultaneously |
| Placement | Below instruction text (below ingredients if v0.4 is active) |
| Auto-start | No — tap to start, duration shown first |
| Completion alert | Toast notification + sound + vibration |
| Navigation | Free — timers keep running in background across steps |

---

### Timer Detection

Client-side regex parses durations from each instruction string. No AI or data model changes required.

**Patterns matched:**
- `"25 minutes"`, `"1 hour"`, `"30 seconds"`
- `"10-12 minutes"` (uses the higher bound)
- `"1 hour and 30 minutes"`, `"1½ hours"`
- `"about 20 min"`, `"approximately 45 mins"`

**Parsing output:**
```typescript
interface DetectedTimer {
  durationSeconds: number;
  label: string; // e.g. "25 min", "1 hr 30 min"
}

// Returns null if no timer found in the text
function detectTimer(instruction: string): DetectedTimer | null;
```

Steps with no time reference show no timer widget.

---

### Timer States

```
  [idle]  →  tap  →  [running]  →  reaches 0  →  [finished]
                        ↕ tap
                     [paused]
```

| State | Display |
|-------|---------|
| Idle | Shows detected duration as tappable pill (e.g. "25:00 — Tap to start") |
| Running | Countdown with animated ring/bar, tap to pause |
| Paused | Paused countdown, tap to resume |
| Finished | "Done!" label, toast + sound + vibration fired |

---

### Lab HUD Integration

#### On the current step

Below the instruction text (and below Smart Ingredients if present):

```
┌─────────────────────────────────┐
│  Bake at 350°F until golden     │  ← instruction
│  brown, about 25 minutes.       │
│                                 │
│  ☐ 2 cups flour                 │  ← ingredients (v0.4)
│  ☐ 1 tsp salt                  │
│                                 │
│  ⏱ 25:00 — Tap to start        │  ← timer (idle)
│                                 │
│  Step 4 of 8                    │
│  ████████████░░░░░░░░░░░░░░░░  │
└─────────────────────────────────┘
```

#### Running timer (on its step)

```
│  ⏱ 18:42  ▮▮                   │  ← timer (running, tap to pause)
```

#### Background timers (on a different step)

When the user navigates away from a step with a running timer, a small floating indicator shows active timers so they're not forgotten. This appears above the progress bar area.

#### Toast on completion

When any timer reaches zero:
- A toast slides in from the top with the step label (e.g. "Step 4 timer done!")
- A chime sound plays
- Device vibration fires (if supported)
- Toast auto-dismisses after 5 seconds or on tap
