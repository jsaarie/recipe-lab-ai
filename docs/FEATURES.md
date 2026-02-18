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
interface AIProvider {
  name: string;
  parseRecipe(pageContent: string): Promise<ParsedRecipe>;
}
```

**Supported providers (MVP):**
- Claude API (Anthropic)
- OpenAI API (GPT)

Provider is selected via environment variable `AI_PROVIDER=claude|openai`.

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

## Feature: Kitchen Psychology — Adaptive Lab HUD (v0.5)

### Overview

The Lab HUD adapts its information hierarchy and layout density to match the psychological demands of the recipe being cooked. Someone making cookies operates in a precise, sequential mindset. Someone making a stir-fry is managing heat, speed, and concurrency. The UI should reflect that energy — not just display the same layout for every recipe.

Classification happens at parse time (single AI call, zero extra latency) and produces a `cookingMode` field on the recipe. The Lab HUD reads this field and renders a mode-specific layout variant.

---

### Cooking Archetypes

| Mode | Examples | Core Demand | Timer Role | Ingredient Role |
|------|----------|-------------|------------|-----------------|
| **Precision** | Baking, pastry, candy | Accuracy and order | Low — steps must be checked before advancing | Dominant — prominent checklist per step |
| **Fire & Speed** | Stir-fry, sauté, sear | Urgency and heat management | Critical — large, at the top of the step | Minimal — just-in-time per step, compact |
| **Low & Slow** | Braise, roast, sous vide | Patience and time awareness | Ambient — displayed but not urgent | Low — set up at the start, then hands-off |
| **Assembly** | Salads, sushi, sandwiches, charcuterie | Organization and mise en place | None | High — all ingredients visible at once, checklist style |
| **Simmer & Build** | Soups, stews, pasta sauces, curries | Layered additions over time | Moderate — one or two key timers | Staged — ingredients appear per phase |

---

### Data Model

`cookingMode` is added to `ParsedRecipe`, extracted during the existing parse call alongside all other fields.

```typescript
type CookingMode =
  | "precision"
  | "fire-and-speed"
  | "low-and-slow"
  | "assembly"
  | "simmer-and-build";

interface ParsedRecipe {
  // ... existing fields ...
  cookingMode: CookingMode;
}
```

If the AI cannot confidently classify the recipe, it defaults to `"simmer-and-build"` as the neutral fallback.

---

### AI Classification

Added to the existing parse prompt (no second call, no extra latency). The AI is given the five archetype names with brief descriptions and asked to return the best match as a single string value.

**Classification guidance given to the AI:**
- `precision` — recipe depends on exact measurements, temperatures, or chemical reactions (baking, pastry, confectionery)
- `fire-and-speed` — recipe involves high heat with short, time-critical steps that cannot be paused (stir-fry, searing, flash-cooking)
- `low-and-slow` — recipe has a long unattended cook phase; the cook's role is primarily setup then waiting (braising, roasting, slow cooking)
- `assembly` — recipe is primarily combining pre-prepared ingredients with little or no active cooking (salads, cold dishes, composed plates)
- `simmer-and-build` — recipe involves sequential additions to a single vessel over moderate heat (soups, stews, sauces, risotto)

---

### Lab HUD Layout Variants

#### Precision Mode (baking, pastry)

Layout goal: accuracy over speed. The cook needs to verify ingredients before each step and proceed deliberately.

```
┌─────────────────────────────────┐
│  Step 3 of 12  ████████░░░░░░  │  ← progress at top
│                                 │
│  ☑ 2¼ cups all-purpose flour   │  ← ingredient checklist
│  ☐ 1 tsp baking soda           │    prominent, expanded
│  ☐ ½ tsp salt                  │    at top of step
│                                 │
│  Whisk dry ingredients together │  ← instruction below
│  until evenly combined.         │
│                                 │
│  [Done — Next Step]            │  ← advance only after checklist
└─────────────────────────────────┘
```

- Ingredient checklist rendered above the instruction text (inverted from default)
- Checklist is expanded by default, not collapsed
- Each ingredient row is checkable; checked state persists across steps
- Timer widget shown below instruction, standard size (timers are rare in baking but present)

#### Fire & Speed Mode (stir-fry, sauté)

Layout goal: urgency. The cook cannot afford to search for the timer.

```
┌─────────────────────────────────┐
│  Step 4 of 6  ████████████░░░  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  ⏱  02:30               │  │  ← timer large, at top
│  │  [Tap to start]          │  │    above instruction
│  └──────────────────────────┘  │
│                                 │
│  Add garlic and ginger, toss    │  ← instruction below timer
│  constantly for 2–3 minutes.    │
│                                 │
│  · 4 cloves garlic, minced      │  ← ingredients compact,
│  · 1 tbsp fresh ginger          │    below instruction
│                                 │    
└─────────────────────────────────┘
```

- Timer widget moved above instruction text and rendered at 1.5× normal size
- Ingredients displayed below the instruction, compact (no checkboxes), just-in-time per step
- Layout density is tighter — less vertical padding between elements
- Background timer pills are more prominent (larger, pinned higher) since concurrency is likely

#### Low & Slow Mode (braise, roast)

Layout goal: patience. Long timers are ambient; the cook knows they have time.

```
┌─────────────────────────────────┐
│  Step 2 of 5  ████░░░░░░░░░░░  │
│                                 │
│  Place the Dutch oven in the    │  ← instruction prominent
│  oven at 325°F. Cook for        │    and spacious
│  2½ hours until fork-tender.   │
│                                 │
│  ⏱ 2:30:00  (ambient)          │  ← timer below, smaller,
│                                 │    subdued style
└─────────────────────────────────┘
```

- Standard layout, instruction text is primary
- Timer rendered below instruction in a quieter, less urgent style (smaller ring, muted color)
- Ingredients are minimal — most are set up in step 1 (mise en place); subsequent steps have few or none
- Generous whitespace — the UI feels unhurried

#### Assembly Mode (salads, sushi, composed plates)

Layout goal: organization. All ingredients are needed now; there are no timers.

```
┌─────────────────────────────────┐
│  Step 1 of 4  ██░░░░░░░░░░░░░  │
│                                 │
│  Mise en place                  │  ← instruction
│  Prepare and arrange all        │
│  ingredients before starting.   │
│                                 │
│  ☐ 4 cups mixed greens         │  ← full ingredient list
│  ☐ 1 cup cherry tomatoes       │    visible, checkable
│  ☐ ½ red onion, thinly sliced  │    all at once
│  ☐ ¼ cup crumbled feta         │
│  ☐ 2 tbsp olive oil            │
│  ☐ 1 tbsp lemon juice          │
│                                 │
│  [Done — Next Step]            │
└─────────────────────────────────┘
```

- No timer widget rendered (assembly recipes have no cook time)
- Ingredient checklist is expanded and comprehensive — all ingredients for the recipe (or for the current phase) shown at once
- Checklist-first layout — ingredients above or alongside instruction

#### Simmer & Build Mode (soups, stews, sauces)

Layout goal: staged additions. The cook adds ingredients in waves; timers are occasional and moderate.

- Default Lab HUD layout (unchanged from current) — this is the neutral baseline
- Per-step ingredients shown below instruction (current behavior)
- Timer rendered below ingredients at standard size (current behavior)
- This mode serves as the fallback when classification is ambiguous

---

### Implementation Notes

- `cookingMode` is read in `LabView` and passed down to child components
- A `useCookingMode(mode)` hook (or simple switch) returns a config object describing the layout variant for that mode — where timers render, where ingredients render, whether checkboxes show, padding scale
- No new API calls or AI passes are needed at render time — the mode is determined at parse time
- The `StepTimer` component accepts a `variant` prop (`"standard" | "prominent" | "ambient"`) controlling its visual scale
- The `StepIngredients` component accepts a `layout` prop (`"checklist-top" | "compact-inline" | "full-list"`) controlling render position and checkbox visibility
- All five modes use the same underlying components — only the composition and props differ

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
