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

### S6d: STEP TIMER (v0.3)
**Purpose:** Auto-detected countdown timers for timed steps. Lets users track cook/wait times without leaving the Lab HUD.

#### Idle State (timer detected, not started)
```
+------------------------------------------+
| [←]       Chicken Parmesan               |
|------------------------------------------|
|                                          |
|  Bake at 350°F until golden              |
|  brown, about 25 minutes.               |
|                                          |
|  ┌──────────────────────────┐            |
|  │  ⏱  25:00  Tap to start │            |
|  └──────────────────────────┘            |
|                                          |
|                     Step 4 of 8          |
|  ████████████░░░░░░░░░░░░░░░░           |
|                                          |
|  [ Done — Next Step          › ]         |
+------------------------------------------+
     Timer pill: rounded-full, neutral border
     Muted text, tap to begin countdown
```

#### Running State (timer counting down)
```
+------------------------------------------+
| [←]       Chicken Parmesan               |
|------------------------------------------|
|                                          |
|  Bake at 350°F until golden              |
|  brown, about 25 minutes.               |
|                                          |
|  ┌──────────────────────────┐            |
|  │  ⏱  18:42           ▮▮  │            |
|  └──────────────────────────┘            |
|                                          |
|                     Step 4 of 8          |
|  ████████████░░░░░░░░░░░░░░░░           |
|                                          |
|  [ Done — Next Step          › ]         |
+------------------------------------------+
     Timer pill: bg-[#7C9070], white text
     Subtle pulse animation
     ▮▮ = pause icon, tap to pause
```

#### Paused State
```
|  ┌──────────────────────────┐            |
|  │  ⏱  18:42  Paused    ▶  │            |
|  └──────────────────────────┘            |
     Timer pill: outlined, brand green border
     ▶ = play icon, tap to resume
```

#### Finished State
```
|  ┌──────────────────────────┐            |
|  │  ✓  Timer done!          │            |
|  └──────────────────────────┘            |
     Green accent bg, checkmark icon
```

#### Background Timers (viewing a different step)
```
+------------------------------------------+
| [←]       Chicken Parmesan               |
|------------------------------------------|
|                                          |
|  Meanwhile, prepare the salad            |
|  by tossing greens with dressing.        |
|                                          |
|  ┌─────────────────┐                    |
|  │ Step 4 · 12:38  │                    |
|  └─────────────────┘                    |
|                                          |
|                     Step 5 of 8          |
|  ██████████████░░░░░░░░░░░░░░           |
+------------------------------------------+
     Background pill: small, rounded-full
     Running: bg-[#7C9070]/10, green text, pulse
     Paused: bg-neutral-100, muted text
     Tap to jump back to that step
```

#### Toast Notification (timer completes)
```
+------------------------------------------+
|  ┌────────────────────────────┐          |
|  │  ⏱  Step 4 timer done!    │          |  <- fixed top, z-50
|  └────────────────────────────┘          |
|                                          |
| [←]       Chicken Parmesan               |
|------------------------------------------|
|  (whatever step user is on)              |
+------------------------------------------+
     Toast: bg-[#7C9070], white text, shadow-lg
     Slides in from top, auto-dismisses 5s
     Two-tone chime sound (Web Audio API)
     Vibration: 200ms-100ms-200ms pattern
     Tap to dismiss early
```

**Elements:**
| # | Element | Description | Status |
|---|---------|-------------|--------|
| 1 | Timer detection | Client-side regex parsing durations from step text | Built |
| 2 | Idle pill | Shows detected duration, "Tap to start" | Built |
| 3 | Running pill | Countdown, pulse animation, tap to pause | Built |
| 4 | Paused pill | Paused countdown, tap to resume | Built |
| 5 | Finished pill | "Timer done!" with checkmark | Built |
| 6 | Background pills | Small indicators for timers on other steps | Built |
| 7 | Toast notification | Slide-in alert with chime + vibration | Built |

**Status:** Built

---

## V0.4 — Smart Ingredients

---

### S6e: SMART INGREDIENTS — PER-STEP DISPLAY
**Purpose:** Show only the ingredients relevant to the current cooking step, inline below the instruction text. Reduces cognitive load — the cook sees exactly what they need for this step instead of scanning a full list.

#### Standard State (step has ingredients)
```
+------------------------------------------+
| [←]       Chicken Parmesan               |
|------------------------------------------|
|                                          |
|  Step 3 of 8                             |
|  ████████████░░░░░░░░░░░░░░░░           |
|                                          |
|  In a large bowl, combine the            |
|  flour, salt, and pepper. Dredge         |
|  each chicken breast in the              |
|  flour mixture.                          |
|                                          |
|  ┌──────────────────────────────┐        |
|  │  ☐  1½ cups all-purpose flour │        |
|  │  ☐  1 tsp salt                │        |
|  │  ☐  ½ tsp black pepper       │        |
|  └──────────────────────────────┘        |
|                                          |
|  [ Done — Next Step          › ]         |
+------------------------------------------+
     Ingredient card: bg-neutral-50,
     rounded-lg, border border-neutral-200
     Checkboxes: rounded, border-neutral-300
```

**Layout (top to bottom within the step content area):**
| Zone | Content | Notes |
|------|---------|-------|
| Step label + progress bar | Unchanged from S6a | Existing |
| Instruction text | Unchanged | Existing |
| **Ingredient card** | Checkable list of step-relevant ingredients | **NEW** |
| Background timer pills | Running timers on other steps | Existing |
| Step timer | Countdown for current step (if detected) | Existing |
| Action button | "Done — Next Step" (desktop only) | Existing |

**Placement rule:** Ingredients sit directly below the instruction text, above timers. This mirrors the logical flow: read what to do → see what you need → start any timer.

---

#### Checked State (some ingredients marked as used)
```
|  ┌──────────────────────────────┐        |
|  │  ✓  1½ cups all-purpose flour │        |  (strikethrough, muted)
|  │  ✓  1 tsp salt                │        |  (strikethrough, muted)
|  │  ☐  ½ tsp black pepper       │        |  (normal)
|  └──────────────────────────────┘        |
     Checked: line-through, text-neutral-400
     Checkbox fill: bg-[#7C9070], white check
     Unchecked: text-neutral-700
```

**Behavior:**
- Tap/click the row or checkbox to toggle
- Checked items show a filled green checkbox with white checkmark
- Checked item text gets `line-through` + `text-neutral-400`
- Unchecked items remain `text-neutral-700`
- **Check state persists across steps** — navigating away and back retains the state
- Check state is local (not persisted across page reloads, same as v0.1 ingredient checks)
- Haptic feedback on toggle (mobile, `navigator.vibrate(10)`)

---

#### All Checked State (every ingredient in this step marked)
```
|  ┌──────────────────────────────┐        |
|  │  ✓  1½ cups all-purpose flour │        |
|  │  ✓  1 tsp salt                │        |
|  │  ✓  ½ tsp black pepper       │        |
|  └──────────────────────────────┘        |
     Card border shifts to border-[#7C9070]/30
     Subtle visual "done" cue, no animation
```

**Behavior:**
- When all ingredients for a step are checked, the card border tints sage green
- No blocking behavior — user can still advance freely regardless of check state
- Purely a visual confirmation cue

---

#### Empty State (step has no ingredients)
```
+------------------------------------------+
| [←]       Chicken Parmesan               |
|------------------------------------------|
|                                          |
|  Step 1 of 8                             |
|  ██░░░░░░░░░░░░░░░░░░░░░░░░░░           |
|                                          |
|  Preheat oven to 400°F.                  |
|                                          |
|                  (no ingredient card)     |
|                                          |
|  [ Done — Next Step          › ]         |
+------------------------------------------+
     Ingredient section is hidden entirely.
     Layout collapses cleanly — no empty space.
```

**Behavior:**
- Steps like "Preheat oven", "Let rest for 10 minutes", or "Serve and enjoy" typically use no ingredients
- The ingredient card is simply not rendered — no "No ingredients" placeholder
- The step timer (if present) moves up to fill the space naturally

---

### S6e-split: SPLIT QUANTITY DISPLAY
**Purpose:** When a single ingredient is used across multiple steps, show only the portion needed for this step with a subtle reference to the total amount.

#### Split quantity notation
```
|  ┌──────────────────────────────┐        |
|  │  ☐  1 cup flour  (of 2 cups) │        |  ← split quantity
|  │  ☐  2 eggs                    │        |  ← full quantity (used in one step)
|  │  ☐  ½ cup sugar  (of 1 cup)  │        |  ← split quantity
|  └──────────────────────────────┘        |
     Split ref: text-neutral-400, text-xs
     Inline after the main quantity+item
```

**Format:**
| Scenario | Display | Notes |
|----------|---------|-------|
| Ingredient used in only this step | `1 tsp salt` | Normal, no annotation |
| Ingredient split across steps | `1 cup flour` `(of 2 cups)` | Parenthetical in muted small text |
| Ingredient fully used here but also elsewhere | `2 tbsp butter` `(of 4 tbsp)` | Shows this step's portion |

**Why this matters:** If a recipe calls for "2 cups flour" but step 2 uses 1½ cups and step 5 uses ½ cup, the cook needs to know to measure out only 1½ cups now — not dump the whole bag. The parenthetical `(of 2 cups)` provides context without clutter.

---

### S6e-full: COMBINED LAB HUD VIEW (All v0.2–v0.4 Features)
**Purpose:** Reference wireframe showing how all Lab HUD elements stack together on a step that has ingredients AND a timer.

```
+------------------------------------------+
| [←]       Chicken Parmesan               |  Lab header
|------------------------------------------|
|                                          |
|  Step 4 of 8                             |  Step label
|  ████████████████░░░░░░░░░░░░░           |  Progress bar
|                                          |
|  Bake the breaded chicken at             |  Instruction text
|  400°F until golden brown and            |
|  cooked through, about 25 min.           |
|                                          |
|  ┌──────────────────────────────┐        |
|  │  ☐  4 breaded chicken breasts │        |  Smart Ingredients (v0.4)
|  │  ✓  1 cup marinara  (of 2c)  │        |  (with split quantity)
|  │  ☐  1 cup mozzarella          │        |
|  └──────────────────────────────┘        |
|                                          |
|  ┌─────────────────┐                    |
|  │ Step 2 · 08:15  │                    |  Background timer pills
|  └─────────────────┘                    |
|                                          |
|       ┌───────────────┐                  |
|       │    24:38      │                  |  Step timer (v0.3)
|       │   ╭──────╮    │                  |  Circular countdown
|       │   │      │    │                  |
|       │   ╰──────╯    │                  |
|       │   [ Pause ]   │                  |
|       └───────────────┘                  |
|                                          |
|  [ Done — Next Step          › ]         |  Action button (desktop)
+------------------------------------------+
```

**Stacking order (top to bottom):**
1. Lab header (sticky)
2. Step label + progress bar
3. Instruction text
4. **Smart Ingredients card** (new in v0.4)
5. Background timer pills (v0.3)
6. Step timer widget (v0.3)
7. Action button (desktop only)

---

### S6e-interaction: INGREDIENT CHECK PERSISTENCE
**Purpose:** Document how checked ingredients behave when navigating between steps.

```
STEP 2: User checks "flour" and "salt"
  ✓ 1½ cups flour
  ✓ 1 tsp salt
  ☐ ½ tsp pepper
        |
        | navigates to step 3, then back to step 2
        v
STEP 2: Checks are preserved
  ✓ 1½ cups flour       (still checked)
  ✓ 1 tsp salt          (still checked)
  ☐ ½ tsp pepper        (still unchecked)
```

**Rules:**
| Behavior | Detail |
|----------|--------|
| State storage | React state — `Map<string, Set<number>>` keyed by `"stepIndex-ingredientIndex"` |
| Navigation | Checks survive step transitions (forward, back, jump via progress bar) |
| Exit & re-enter Lab | Checks survive (state lives in parent `home-page.tsx`) |
| Page reload | Checks reset (no persistence to localStorage in v0.4) |
| New recipe | Checks reset (new recipe = new state) |

---

### S6e-data: DATA MODEL & AI EXTRACTION
**Purpose:** Document the data flow changes required for Smart Ingredients.

#### ParsedRecipe extension
```typescript
interface ParsedRecipe {
  // ... existing fields (title, source, times, servings,
  //     ingredients, instructions, notes) ...

  stepIngredients: {
    quantity: string;   // "1½" or "1" — this step's portion
    unit: string;       // "cups", "tsp"
    item: string;       // "all-purpose flour"
    totalQuantity?: string;  // "2" — full recipe amount (only if split)
    totalUnit?: string;      // "cups" — full recipe unit (only if split)
  }[][];
  // stepIngredients[i] = ingredients for instructions[i]
  // stepIngredients[i] = [] means step i uses no ingredients
}
```

#### AI prompt extension
```
Single AI call (no second pass). The extraction prompt adds:

"For each instruction step, identify which ingredients are used in that
step. If an ingredient is used across multiple steps, split the quantity
proportionally. Return a `stepIngredients` array parallel to
`instructions`, where each entry is an array of ingredients used in
that step. Include `totalQuantity` and `totalUnit` only when the
ingredient is split across steps."
```

#### Validation
```
Zod schema extended with:

stepIngredients: z.array(
  z.array(
    ingredientSchema.extend({
      totalQuantity: z.string().optional(),
      totalUnit: z.string().optional(),
    })
  )
)

Post-validation check: stepIngredients.length === instructions.length
```

#### Fallback behavior
| Scenario | Handling |
|----------|----------|
| AI returns no `stepIngredients` | Feature hidden — Lab HUD works exactly like v0.3 |
| `stepIngredients` length mismatch | Feature hidden — fall back gracefully |
| Step has empty array `[]` | Ingredient card hidden for that step |
| Structured data (JSON-LD) parse | No `stepIngredients` — feature hidden (AI-only) |

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
| S6d | Step Timer | v0.3 | Auto-detected countdown timers in HUD | YES |
| S6e | Smart Ingredients | v0.4 | Per-step ingredient display in HUD | NO |
| S6e-split | Split Quantity | v0.4 | Partial-use ingredient notation | NO |
| S6e-full | Combined HUD View | v0.4 | All features stacked together | NO |
| S6e-interaction | Check Persistence | v0.4 | Cross-step checkbox state | NO |
| S6e-data | Data Model & AI | v0.4 | ParsedRecipe extension + prompt | NO |

**Total screens: 18 (11 fully built, 1 partial, 5 not built, 1 sub-state)**
