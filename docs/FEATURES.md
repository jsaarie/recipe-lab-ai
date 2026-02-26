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
