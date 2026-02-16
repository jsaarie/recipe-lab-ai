# Recipe Lab AI — UI Storyboard & User Journey

## Journey Overview

```
[S1: Landing]  -->  [S2: Input]  -->  [S3: Loading]  -->  [S4: Recipe View]
   Hero              URL Paste        Extraction           Result Display
                         |                                      |
                         v                                 +----+----+
                    [S2a: Error]                           |         |
                    Validation                             v         v
                                                    [S4a: Check] [S6: Lab Banner]
                                                    Ingredients   "Enter the Lab"
                                                         |              |
                                                         v              v
                                                   [S5: New Search]  [S6a: Lab HUD]
                                                   Compact Header    Active Step
                                                         |              |
                                                         v         +----+----+
                                                   (loops to S3)   |         |
                                                                   v         v
                                                             [S6a: Next] [S4: Recipe]
                                                             Step loop   (flip back)
                                                                   |
                                                                   v
                                                             [S6c: Complete]
                                                             Recipe Done!
```

---

## Screen-by-Screen Breakdown

---

### S1: LANDING / HERO STATE
**Purpose:** First impression. Communicate what the app does in 1 second.

```
+------------------------------------------+
|                                          |
|                                          |
|                                          |
|         Recipe Lab  AI                   |
|         (large, centered)                |
|                                          |
|   +----------------------------------+   |
|   | Paste a recipe URL...            |   |
|   +----------------------------------+   |
|   [        Extract Recipe            ]   |
|                                          |
|                                          |
|                                          |
+------------------------------------------+
          Background: #FAF8F5 (warm cream)
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Brand title | "Recipe Lab **AI**" — sage green accent on "AI" | Built |
| 2 | URL input | Rounded pill input, placeholder text | Built |
| 3 | CTA button | "Extract Recipe" — sage green, full width on mobile | Built |

**User Action:** Paste a URL and tap/click "Extract Recipe"

**Notes:**
- On mobile, the button is hidden (form submits on Enter)
- Input field and button are vertically centered on viewport
- No navigation, no footer — maximum simplicity

---

### S2: INPUT / URL ENTRY
**Purpose:** User pastes or types a recipe URL.

```
+------------------------------------------+
|                                          |
|         Recipe Lab  AI                   |
|                                          |
|   +----------------------------------+   |
|   | https://example.com/cookies  [x] |   |
|   +----------------------------------+   |
|   [        Extract Recipe            ]   |
|                                          |
+------------------------------------------+
```

**User Action:** Types/pastes URL, presses Enter or clicks button

**Validation triggers on submit:**
- Empty input -> S2a
- Invalid URL format -> S2a
- Valid URL -> S3

---

### S2a: INPUT ERROR STATE
**Purpose:** Guide user to correct their input.

```
+------------------------------------------+
|                                          |
|         Recipe Lab  AI                   |
|                                          |
|   +----------------------------------+   |
|   | not-a-url                        |   |
|   +----------------------------------+   |
|   [        Extract Recipe            ]   |
|                                          |
|   "Please enter a valid URL              |
|    (e.g. https://example.com/recipe)"    |
|                                          |
+------------------------------------------+
        Error text: red-500, centered
```

**Error Messages:**
| Condition | Message |
|-----------|---------|
| Empty input | "Please enter a recipe URL." |
| Invalid URL | "Please enter a valid URL (e.g. https://example.com/recipe)." |
| API failure | *Not yet implemented* |
| Non-recipe page | *Not yet implemented* |

**User Action:** Fix the URL and resubmit

**Status:** Validation built. API error states NOT yet implemented.

---

### S3: LOADING / EXTRACTION STATE
**Purpose:** Reassure user that work is happening. Prevent re-submission.

```
+------------------------------------------+
|                                          |
|                                          |
|                                          |
|         Recipe Lab  AI                   |
|         (medium, centered)               |
|                                          |
|         [spinner] Extracting recipe...   |
|                                          |
|                                          |
|                                          |
+------------------------------------------+
        Spinner: animated SVG, sage green
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Brand title | Slightly smaller than hero | Built |
| 2 | Spinner | Animated SVG circle, #7C9070 | Built |
| 3 | Status text | "Extracting recipe..." | Built |

**Duration:** ~1.5s (mock) / variable (real API)

**User Action:** Wait. No interactive elements.

**Missing (future):**
- Progress stages ("Fetching page...", "Reading recipe...", "Formatting...")
- Cancel button
- Timeout error handling (>10s)

---

### S4: RECIPE VIEW / RESULT STATE
**Purpose:** Display the clean, extracted recipe. This is the core value of the app.

```
+------------------------------------------+
| Recipe Lab AI  [paste URL...] [Extract]  |  <-- Sticky header
|------------------------------------------|
|                                          |
|  +------------------------------------+  |
|  |  Recipe ready! · 8 steps · 27 min  |  |  <-- Lab Entry Banner (S6)
|  |  [     Enter the Lab  >>         ] |  |
|  +------------------------------------+  |
|                                          |
|     Classic Chocolate Chip Cookies       |
|          View original recipe ->         |
|                                          |
|   [Prep 15m] [Cook 12m] [Total 27m]     |
|   [Servings 24 cookies]                  |
|   -------- divider ---------             |
|                                          |
|   Ingredients                            |
|   [x] 2 1/4 cups all-purpose flour      |
|   [ ] 1 tsp baking soda                 |
|   [ ] 1 cup butter, softened            |
|   ...                                    |
|                                          |
|   -------- divider ---------             |
|                                          |
|   Instructions                           |
|   (1) Preheat oven to 375F...           |
|   (2) Combine flour, baking soda...     |
|   (3) Beat butter, sugar...             |
|   ...                                    |
|                                          |
|   -------- divider ---------             |
|                                          |
|   Notes                                  |
|   Store in an airtight container...      |
|                                          |
+------------------------------------------+
```

**Sections (top to bottom):**
| # | Section | Elements | Status |
|---|---------|----------|--------|
| A | **Sticky Header** | Brand name + compact URL input + "Extract" button | Built |
| B | **Title Block** | Recipe name (bold, centered) + "View original" link | Built |
| C | **Meta Pills** | Prep, Cook, Total time + Servings as pill badges | Built |
| D | **Ingredients** | Checkable list with strikethrough on check | Built |
| E | **Instructions** | Numbered steps with circular step badges | Built |
| F | **Notes** | Optional tips/storage section | Built |

**User Actions on this screen:**
- Click "Enter the Lab" on the banner (-> S6a)
- Check/uncheck ingredients (S4a)
- Click "View original recipe" (opens source in new tab)
- Paste a new URL in the compact header input (-> S3 again)

---

### S4a: INGREDIENT INTERACTION
**Purpose:** Let users track which ingredients they've gathered.

```
   Ingredients
   [x] 2 1/4 cups all-purpose flour      (strikethrough, gray)
   [x] 1 tsp baking soda                 (strikethrough, gray)
   [ ] 1 cup butter, softened            (normal, dark)
   [ ] 3/4 cup granulated sugar          (normal, dark)
```

**Behavior:**
- Tap/click toggles checkbox
- Checked items: `line-through` + `text-neutral-400`
- Unchecked items: `text-neutral-700`
- State is local only (not persisted)

**Status:** Built. Not persisted across page reloads.

---

### S5: NEW SEARCH / REPEAT FLOW
**Purpose:** Allow extracting another recipe without leaving the page.

```
+------------------------------------------+
| Recipe Lab AI  [new-url...    ] [Extract]|  <-- User types here
|------------------------------------------|
|                                          |
|     (previous recipe still visible       |
|      while new one loads)                |
|                                          |
+------------------------------------------+
```

**Behavior:**
- Header stays sticky at top with compact input
- On submit: previous recipe disappears, loading state (S3) appears
- On success: new recipe replaces old one (S4)

**Status:** Built.

---

## V0.2 — The Lab (Cooking HUD)

---

### S6: LAB ENTRY BANNER
**Purpose:** Confirmation step between viewing the recipe and entering cooking mode. Gives the user a quick summary and a clear action to start.

```
+------------------------------------------+
| Recipe Lab AI  [paste URL...] [Extract]  |  <-- Sticky header
|------------------------------------------|
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |   Recipe ready!                    |  |
|  |   Classic Chocolate Chip Cookies   |  |
|  |   8 steps  ·  27 min total        |  |
|  |                                    |  |
|  |   [ Enter the Lab  >>           ] |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  (recipe card continues below...)        |
|                                          |
+------------------------------------------+
     Banner: bg-[#7C9070]/5, border-[#7C9070]/20
     Button: bg-[#7C9070], white text, full-width, large
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Status label | "Recipe ready!" — small, muted green text | Built |
| 2 | Recipe title | Bold, truncated if long | Built |
| 3 | Quick meta | Step count + total time as inline text | Built |
| 4 | CTA button | "Enter the Lab" — full-width, large, brand green | Built |

**User Action:** Click "Enter the Lab" to switch to the Lab HUD (-> S6a)

**Behavior:**
- Banner sits between sticky header and recipe card
- Always visible without scrolling (above the fold)
- Clicking the button transitions the entire view to the Lab HUD
- Recipe card remains scrollable below the banner

---

### S6a: LAB HUD — ACTIVE STEP
**Purpose:** The core cooking experience. Shows one step at a time with progress context and a preview of what's next.

```
+------------------------------------------+
| [< Exit Lab]     The Lab                 |  <-- Lab header
|------------------------------------------|
|                                          |
|  Progress Map                            |
|  (1)  (2)  [3]  (4)  (5)  (6)  (7)  (8)|
|   *    *    ^    ·    ·    ·    ·    ·   |
|  done done HERE                          |
|                                          |
|  -------- divider ---------              |
|                                          |
|  STEP 3 of 8                             |
|                                          |
|  "In a large bowl, beat the butter       |
|   and sugars together until light        |
|   and fluffy, about 3-4 minutes.         |
|   Add eggs one at a time, beating        |
|   well after each addition."             |
|                                          |
|  -------- divider ---------              |
|                                          |
|  On Deck — Step 4                        |
|  "Gradually stir in the flour            |
|   mixture until just combined..."        |
|                                          |
|                                          |
|------------------------------------------|
| [      Done — Next Step  >>            ] |  <-- Fixed bottom action
+------------------------------------------+
```

**Layout Zones (top to bottom):**
| Zone | Content | Styling |
|------|---------|---------|
| **Header** | "Exit Lab" link (left) + "The Lab" title (center) | Sticky, bg-[#FAF8F5], border-b |
| **Progress Map** | Horizontal strip of step indicators (numbered circles) | Scrollable if many steps |
| **Active Step** | Step number label + full instruction text | Large text, centered, padded generously |
| **On Deck** | "On Deck — Step N" + muted preview of next step | Smaller text, text-neutral-400, bg-neutral-50 |
| **Action Bar** | "Done — Next Step" button | Fixed to bottom, full-width, large, brand green |

**Progress Map Detail:**
```
  Completed steps:   (1)  filled circle, bg-[#7C9070], white text
  Current step:      [3]  larger circle, ring/outline, bg-[#7C9070]/10, bold text
  Upcoming steps:    (5)  hollow circle, border-neutral-300, text-neutral-400
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Exit Lab link | "< Exit Lab" — returns to S4 recipe view | Built |
| 2 | Lab title | Recipe title — centered header text | Built |
| 3 | Progress map | Dot indicators with current highlighted | Built |
| 4 | Step label | "STEP N of M" — uppercase, small, muted | Built |
| 5 | Step instruction | Full instruction text, large and readable, centered | Built |
| 6 | On Deck preview | Faded card with next step preview | Built |
| 7 | Action button | "Done — Next Step" — fixed bottom mobile, inline desktop | Built |

**User Actions:**
- **Desktop:** Click "Done — Next Step" inline button to advance (-> S6b transition)
- **Mobile:** Swipe left or tap right half of screen to advance (-> S6b transition)
- **Mobile:** Swipe right or tap left half of screen to go back
- Tap "< Exit Lab" to return to recipe view (-> S4), preserving current step position
- Tap any step in the progress map to jump to that step

**On Deck Behavior:**
- Shows the next step's instruction text in a muted, less prominent style
- On the **last step**, the On Deck section is hidden or shows "This is the last step!"
- Gives the cook a heads-up on what's coming so they can prep mentally

**Special States:**
- **First step:** Progress map shows step 1 as current, no completed steps
- **Last step:** "On Deck" section hidden, button text changes to "Finish Recipe"
- **Single-step recipe:** Progress map shows 1 of 1, no On Deck, button says "Finish Recipe"

---

### S6a-mobile: DIRTY-HANDS NAVIGATION (Mobile Only)
**Purpose:** Allow hands-free or minimal-touch step navigation when the user's hands are messy. Replaces the fixed bottom button on mobile with swipe gestures and large invisible tap zones.

```
MOBILE LAB HUD — TAP ZONES & SWIPE
+------------------------------------------+
| [< Exit Lab]   Recipe Title              |
|------------------------------------------|
|  ·  ·  (3)  ·  ·  ·  ·  ·              |  Progress dots
|------------------------------------------|
|          |                    |           |
|          |                    |           |
|   TAP    |    STEP 3 of 8    |   TAP     |
|   LEFT   |                   |   RIGHT   |
|   ZONE   |  "In a large      |   ZONE    |
|          |   bowl, beat..."  |           |
|   < go   |                   |   next >  |
|   back   |                   |   step    |
|          |                    |           |
|  <----   |                    |   ---->   |  Edge arrow hints
|          |                    |           |
|------------------------------------------|
|  On Deck — Step 4                        |
|  "Gradually stir in the flour..."        |
+------------------------------------------+

  NO fixed bottom button on mobile.
  Swipe LEFT anywhere = advance to next step
  Swipe RIGHT anywhere = go back one step
```

**Navigation Methods (layered, all active simultaneously):**

| Method | Action | Direction |
|--------|--------|-----------|
| **Swipe left** | Advance to next step | Anywhere on screen |
| **Swipe right** | Go back one step | Anywhere on screen |
| **Tap right half** | Advance to next step | Right 40% of screen |
| **Tap left half** | Go back one step | Left 40% of screen |
| **Tap progress dot** | Jump to specific step | Progress strip |

**Edge Arrow Hints:**

```
  Left edge:     ‹  (chevron-left)
  Right edge:    ›  (chevron-right)

  Appearance:
  - Small, semi-transparent arrows (text-neutral-300/50)
  - Positioned vertically centered on left/right screen edges
  - Fade in on Lab entry, fade out after 3 seconds
  - Reappear briefly on each step transition
  - On first step: left arrow hidden (no previous step)
  - On last step: right arrow hidden (use "Finish Recipe" tap zone instead)
```

**Swipe Behavior:**
- Minimum swipe distance: ~50px to prevent accidental triggers
- Swipe triggers the same slide animation as S6b (step transition)
- Swipe direction matches content movement (swipe left = content slides left, next step enters from right)
- No swipe on first step going back, no swipe on last step going forward (triggers finish instead)
- Haptic feedback on swipe if device supports it (navigator.vibrate)

**Tap Zone Behavior:**
- Left 40% of screen = go back, right 40% = advance
- Center 20% is a dead zone to prevent accidental taps while reading
- Tap zones exclude the header area and progress strip (those have their own tap targets)
- Single tap only — no visual feedback on the tap zone itself, the step transition IS the feedback
- On last step: right tap zone triggers "Finish Recipe" (-> S6c)

**First-Step State:**
```
+------------------------------------------+
|                                           |
|   (no left arrow)     STEP 1 of 8    ›   |
|                                           |
+------------------------------------------+
  Left tap zone: disabled (no previous step)
  Left arrow: hidden
  Right arrow: visible, fades after 3s
```

**Last-Step State:**
```
+------------------------------------------+
|                                           |
|   ‹     STEP 8 of 8     (no right arrow) |
|                                           |
|   On Deck section: HIDDEN                |
|   Right tap/swipe: triggers S6c (finish) |
+------------------------------------------+
```

**Desktop vs Mobile:**

| Feature | Mobile | Desktop |
|---------|--------|---------|
| Swipe gestures | Active | Disabled |
| Tap zones | Active | Disabled |
| Edge arrow hints | Shown (fade after 3s) | Hidden |
| Fixed bottom button | **Removed** | Hidden |
| Inline "Done" button | Hidden | **Shown** |

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Left tap zone | Invisible, left 40% of content area | Built |
| 2 | Right tap zone | Invisible, right 40% of content area | Built |
| 3 | Swipe handler | Touch event listener for horizontal swipes | Built |
| 4 | Left edge arrow | ‹ chevron, fades after 3s, hidden on step 1 | Built |
| 5 | Right edge arrow | › chevron, fades after 3s, hidden on last step | Built |

**Status:** Built

---

### S6b: STEP TRANSITION
**Purpose:** Visual feedback when advancing between steps. Keeps the user oriented.

```
  Step 3 instruction slides LEFT (exits)
                   |
                   v
  Step 4 instruction slides in from RIGHT (enters)
  Progress map: (3) fills in as complete, [4] becomes current
  On Deck updates to show Step 5
```

**Behavior:**
- Triggered when user taps "Done — Next Step"
- Current step text slides out to the left
- Next step text slides in from the right
- Progress map animates: current dot fills (completed), next dot enlarges (now current)
- On Deck content updates to show the step after the new current step
- On the **last step transition**, navigates to S6c (Recipe Complete)

**Timing:** Transition should be quick (~200-300ms) — this is a kitchen app, not a presentation

**Status:** Built

---

### S6c: RECIPE COMPLETE
**Purpose:** Celebrate finishing the recipe. Provide clear next actions.

```
+------------------------------------------+
|                                          |
|                                          |
|                                          |
|             You did it!                  |
|                                          |
|   Classic Chocolate Chip Cookies         |
|   8 steps completed                      |
|                                          |
|                                          |
|   [ View Full Recipe ]                   |
|                                          |
|   [ Cook Another ]                       |
|                                          |
|                                          |
+------------------------------------------+
     "You did it!": text-2xl, bold, text-[#7C9070]
     Title: text-lg, text-neutral-700
     Buttons: stacked, full-width
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Celebration text | "You did it!" — large, bold, brand green | Built |
| 2 | Recipe title | Name of the completed recipe | Built |
| 3 | Step count | "N steps completed" — muted subtext | Built |
| 4 | View Recipe button | Returns to S4 (recipe view) — outline style | Built |
| 5 | Cook Another button | Returns to S1 (hero/landing) — brand green | Built |

**User Actions:**
- "View Full Recipe" -> S4 (recipe view with banner)
- "Cook Another" -> S1 (landing page, clears current recipe)

**Status:** Built

---

## Full User Journey Map

```
USER ARRIVES
     |
     v
[S1] Landing Page (Hero)
     |
     | pastes URL
     v
[S2] URL Input ------invalid-----> [S2a] Error Message
     |                                    |
     | valid URL                          | user fixes
     v                                    |
[S3] Loading State <----------------------+
     |
     | extraction complete
     v
[S4] Recipe Displayed  +  [S6] Lab Entry Banner
     |                          |
     |---> [S4a] Check          | clicks "Enter the Lab"
     |     ingredients          v
     |                    [S6a] Lab HUD (Active Step)
     |                          |
     |  <-- "Exit Lab" ---------+---> taps "Done — Next Step"
     |  (preserves step)        |           |
     |                          |           v
     |                          |     [S6b] Step Transition
     |                          |           |
     |                          +<----------+  (loops: next step)
     |                          |
     |                          |  (last step completed)
     |                          v
     |                    [S6c] Recipe Complete
     |                          |
     |  <-- "View Recipe" ------+
     |                          |
     | pastes new URL           | "Cook Another"
     v                          v
[S5] New Search           [S1] Landing (reset)
     |
     v
[S3] Loading State (loops)
```

---

## Gap Analysis: What's Missing from MVP

| Screen | Gap | Priority | Effort |
|--------|-----|----------|--------|
| S2a | API error state ("Couldn't extract recipe") | HIGH | Small |
| S2a | Non-recipe page error ("This doesn't look like a recipe") | HIGH | Small |
| S3 | Multi-stage progress ("Fetching... Reading... Formatting...") | LOW | Medium |
| S3 | Timeout handling (>10s with retry option) | MEDIUM | Small |
| S3 | Cancel extraction button | LOW | Small |
| S4 | Empty state for missing fields (no cook time, no notes) | MEDIUM | Small |
| S4 | Print-friendly view / print button | LOW | Medium |
| S4 | Share/copy recipe button | LOW | Small |
| S4 | Scroll-to-section navigation (jump to ingredients) | LOW | Medium |
| S5 | Confirm before replacing current recipe | LOW | Small |
| ALL | Mobile "Submit" button (currently hidden, Enter-only) | HIGH | Small |
| ALL | Skeleton loading placeholders instead of spinner | LOW | Medium |
| ALL | 404 / offline fallback page | LOW | Small |

---

## Screen Inventory Summary

| ID | Screen Name | Version | State | Built? |
|----|-------------|---------|-------|--------|
| S1 | Landing / Hero | v0.1 | Default, empty | YES |
| S2 | URL Input | v0.1 | User typing | YES |
| S2a | Input Error | v0.1 | Validation failed | PARTIAL |
| S3 | Loading | v0.1 | Extraction in progress | YES |
| S4 | Recipe View | v0.1 | Result displayed (updated with Lab banner) | YES |
| S4a | Ingredient Check | v0.1 | Interactive toggle | YES |
| S5 | New Search | v0.1 | Compact header input | YES |
| S6 | Lab Entry Banner | v0.2 | Confirmation before Lab | YES |
| S6a | Lab HUD — Active Step | v0.2 | Guided cooking step view | YES |
| S6a-m | Dirty-Hands Nav | v0.2 | Swipe + tap zones, edge arrows (mobile) | YES |
| S6b | Step Transition | v0.2 | Animation between steps | YES |
| S6c | Recipe Complete | v0.2 | Celebration / end state | YES |

**Total screens: 12 (10 fully built, 1 partial, 1 sub-state)**
