# Recipe Lab AI — E2E / UX Manual Test Plan (v2.1 patch)

**Scope:** Twelve user-visible bug fixes in the v2.1 recipe editing layer.
**Testing framework:** Manual (no Playwright/Cypress configured in `package.json`).
**Entry point:** `http://localhost:3000` (`pnpm dev`).
**Prerequisite for all scenarios:** A parsed recipe is already loaded. Use a stable, freely accessible recipe URL or exercise the fixture approach described in the setup note below.

---

## Setup Note

Because every scenario starts from a loaded recipe, it is quickest to use a recipe that reliably parses without a paywall. Throughout this plan the placeholder **"[recipe URL]"** is used. A suggested canonical test URL for local development:

```
https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
```

If that site is Cloudflare-blocked in your environment, configure `BROWSERLESS_API_KEY` in `.env.local`, or use any recipe that loads cleanly.

Where a specific ingredient configuration is needed (e.g. a recipe with "butter", "⅓ cup flour", "12–16 cookies"), you may need to find or mock a suitable recipe. Notes are included per scenario.

---

## Scenario 1 — Unit Conversion Input: Editing a Metric Quantity Preserves the User's Value

**Bug reference:** Issue #1 — "user sees '237 ml', types '300', expects 300 ml result (not 300 cups converted)"

**Root cause context:** `IngredientRow` in `recipe-card.tsx` initialises `qtyDraft` from `ingredient.quantity` (the already-converted string "237"). When the user commits "300", the hook receives the raw string and re-converts it as if "300" were still in US units (cups), producing a nonsensical metric result.

### Preconditions

- Recipe is loaded.
- Unit system is set to **Metric** (click the "US" toggle in the Ingredients header once so it reads "Metric").
- At least one ingredient with a US volume unit (e.g. "1 cup water") is visible. After toggling to metric it should display "~237 ml".

### Steps

1. Load the recipe and confirm the ingredient shows "237 ml water" (or similar metric value).
2. Tap/click the quantity portion of that ingredient row ("237").
3. The inline quantity input appears pre-filled with "237".
4. Clear the field and type "300".
5. Press **Enter** (or click away to blur).

### Expected result (post-fix)

- The ingredient row updates to "300 ml water".
- The quantity field is **not** re-run through unit conversion. The edited value is stored verbatim and displayed as entered ("300 ml").

### Previous broken result (pre-fix)

- The hook would receive "300" and treat it as 300 cups, converting that to ~71,000 ml or some other nonsensical metric value. Alternatively, a stale conversion from the pre-edit unit would be applied.

---

## Scenario 2 — Name Matching: Hyphenated vs. Unhyphenated Ingredient Highlighted in Lab HUD

**Bug reference:** Issue #2 — "'all-purpose flour' and 'all purpose flour' highlight the same ingredient in Lab HUD"

**Root cause context:** `patchedStepIngredients` in `lab-view.tsx` matches step ingredients to `derivedIngredients` using a case-insensitive exact `toLowerCase()` comparison (`d.item.toLowerCase() === si.item.toLowerCase()`). If the recipe's ingredient list says "all-purpose flour" but `stepIngredients` from the AI says "all purpose flour" (no hyphen), the comparison fails and the step ingredient is not highlighted/scaled.

### Preconditions

- A recipe with "all-purpose flour" (hyphenated) in the flat ingredient list is loaded.
- The AI step-ingredient mapping refers to the same ingredient as "all purpose flour" (no hyphen) — this is a realistic AI variance.
- Step-ingredient mapping has completed (the "Loading ingredients..." indicator is gone).
- Enter The Lab.

### Steps

1. Navigate through Lab steps until reaching a step that uses flour.
2. Observe the ingredient chip displayed for that step.
3. Compare the item name shown to what appears in the recipe card's ingredient list.

### Expected result (post-fix)

- The Lab HUD shows the flour chip with the correct scaled quantity regardless of hyphen variance.
- The ingredient name matching is normalised (hyphens/spaces are treated as equivalent), so "all-purpose flour" and "all purpose flour" resolve to the same entry.

### Previous broken result (pre-fix)

- The step ingredient chip would appear with the AI-provided raw quantity (un-scaled) or would be missing entirely if the item name did not match exactly. No derived quantity (scaling/conversion) would be applied to flour in the per-step view.

---

## Scenario 3 — Swapped Ingredient in Lab HUD: Shows New Name with Scaled Qty

**Bug reference:** Issue #3 — "after swapping 'butter' → 'margarine', Lab HUD shows 'margarine' with scaled qty"

**Root cause context:** `patchedStepIngredients` looks up items in `derivedIngredients` by `d.item.toLowerCase()`. When the user swaps "butter" to "margarine", `derivedIngredients` now contains `item: "margarine"`. But `recipe.stepIngredients` still has `item: "butter"`. The lookup fails because "margarine" !== "butter", so the Lab HUD either keeps showing "butter" or shows an un-scaled quantity.

### Preconditions

- A recipe containing "butter" as a listed ingredient is loaded.
- Serving count is changed to **double** the original (e.g. original 4 → set to 8) so a scaling difference is visible.
- In the recipe card, tap the swap icon (arrows) next to "butter", type "margarine", press Enter. Confirm the ingredient row now reads "margarine (swapped)".
- Step-ingredient mapping has completed.

### Steps

1. Enter The Lab.
2. Navigate to a step that uses butter (look for the step ingredient chip).
3. Observe the chip label and quantity.

### Expected result (post-fix)

- The chip shows "margarine" (not "butter").
- The quantity shown is the scaled version matching the doubled serving count.
- The unit matches what appears in the recipe card for that ingredient.

### Previous broken result (pre-fix)

- The chip showed "butter" with the original (un-scaled) quantity because the item-name lookup could not connect "butter" in `stepIngredients` to "margarine" in `derivedIngredients`.

---

## Scenario 4 — Density Path: "1 cup flour" in Metric Shows "~120g" Not "237 ml"

**Bug reference:** Issue #4 — "'1 cup flour' in metric shows '~120g' not '237 ml'"

**Root cause context:** The desired behaviour is that volume-to-weight conversion is attempted via `applyConversion` → `volumeToGrams` when `targetSystem === "metric"`. If a density entry exists for the ingredient, the result should be grams, not ml. A plain `convertUnit` call alone would give 237 ml. The density path must be reached and produce a gram result.

### Preconditions

- A recipe with "1 cup all-purpose flour" (or "1 cup flour") in the ingredient list is loaded.
- Unit system is currently **US**.

### Steps

1. Observe the ingredient: it should read "1 cup all-purpose flour".
2. Click the unit toggle to switch to **Metric**.
3. Observe the ingredient display.

### Expected result (post-fix)

- The ingredient shows approximately "120g all-purpose flour" (density: 120 g/cup per `density.ts`).
- It does **not** show "237 ml all-purpose flour".

### Previous broken result (pre-fix)

- If the density path was not reached (e.g. `convertUnit` returned a result before density lookup), the display would show "237 ml" (a straight volume conversion with no density applied).

---

## Scenario 5 — No-op Quantity Commit: Tapping Qty and Pressing Enter Without Changing It Does Not Pin the Ingredient

**Bug reference:** Issue #5 — "tap qty, do not change, press Enter → no pin indicator appears"

**Root cause context:** In `IngredientRow`, `commitQty` calls `onQuantityChange(index, qtyDraft.trim() || ingredient.quantity)`. If the user never changes the draft, `qtyDraft` equals `ingredient.quantity` and the hook still receives a call to `setIngredientQuantity`, creating an override entry in `ingredientOverrides`. That entry causes the quantity to display with the "pinned" green style and causes `isModified` to become `true` (showing the Reset button), even though the user made no actual change.

### Preconditions

- A recipe is loaded.
- Unit system is **US** (default).
- Serving count is at the original value.
- No existing overrides (if any, click "Reset" to clear).

### Steps

1. Tap/click the quantity of any ingredient (e.g. "2" for "2 cups flour").
2. The inline input appears with the existing value pre-filled.
3. Do **not** change the value.
4. Press **Enter** (or click away to blur).

### Expected result (post-fix)

- The ingredient quantity returns to its normal display style (no green highlight, not bolded differently).
- The "Reset" button does **not** appear in the Ingredients header (no modifications detected).
- `ingredientOverrides` does not contain an entry for this ingredient.

### Previous broken result (pre-fix)

- The ingredient quantity turned green/bold (indicating a pinned override).
- The "Reset" button appeared even though the user made no change.
- Scaling the serving count no longer updated this ingredient because it was treated as pinned.

---

## Scenario 6 — Metric Fractions: Metric Quantities Show as Whole/Unicode Fraction, Not Decimal with ".0"

**Bug reference:** Issue #6 — "metric quantities show as '237.0 ml' not '237⅛ ml'"

**Root cause context:** `formatQuantity` in `fractions.ts` formats decimal values. If `bestMetricVolumeUnit` in `conversions.ts` returns a value like 236.588 and `formatQuantity` produces a decimal with trailing ".0" or many decimal places instead of a clean integer or Unicode fraction, the display is ugly. The fix should ensure `formatQuantity` is called on the computed metric quantity and snaps to the nearest sensible fraction.

### Preconditions

- A recipe is loaded with an ingredient that converts to a non-integer metric amount (e.g. "1 cup" → 236.588 ml, or "1 tbsp" → 14.79 ml).

### Steps

1. Toggle to **Metric**.
2. Look at any ingredient that was a US volume unit.

### Expected result (post-fix)

- Quantities read as clean integers or Unicode fractions: "237 ml", "15 ml", "120g".
- No trailing ".0" or long decimal tails (e.g. "236.588 ml" or "14.7868 ml") are shown.
- Where a non-trivial fraction applies, it uses Unicode characters (e.g. "14⅞ ml" rather than "14.875 ml").

### Previous broken result (pre-fix)

- Quantities showed raw floating-point values like "236.588 ml" or "14.7868 ml" due to `formatQuantity` falling through to the decimal fallback.

---

## Scenario 7 — Lab HUD Thirds: "⅓ cup" Split Across 2 Steps Shows "⅙" Each, Not "⅛"

**Bug reference:** Issue #7 — "'⅓ cup' split across 2 steps shows '⅙' each, not '⅛'"

**Root cause context:** `patchedStepIngredients` computes `ratio = siQty / siTotal` where `siQty` = `parseQuantity("⅓")` = 0.333 and `siTotal` = `parseQuantity("⅔")` = 0.667. `ratio` = 0.5. Applied to `derivedQty` of 0.333, result is 0.1667. Then `Math.round(0.1667 * 8) / 8` = `Math.round(1.333) / 8` = `1/8 = 0.125`. `formatQuantity(0.125)` = "⅛". The bug is in the old code path that used `parseFloat` on the fraction string rather than `parseQuantity`, which would give `parseFloat("⅓")` = `NaN` → fallback to 1, making ratio = 1, and so the full derived quantity (0.333) is shown per step. With `parseQuantity` correctly used, the split works and each step gets "⅙".

### Preconditions

- A recipe containing a "⅓ cup" ingredient that is used across two distinct steps is loaded, with `stepIngredients` data mapping it to both steps (set `totalQuantity` = "⅔").
- This requires a recipe where the AI mapping identified the split; in practice, you may need to use a recipe where the split is obvious (e.g. "add ⅓ cup broth to pan; reserve remaining ⅓ cup for sauce").

### Steps

1. Load such a recipe. Confirm step-ingredient mapping is complete.
2. Enter The Lab.
3. Navigate to the first step that uses the ⅓ cup ingredient.
4. Note the quantity shown in the step chip.
5. Navigate to the second step that uses the same ingredient.
6. Note the quantity shown there.

### Expected result (post-fix)

- Each step shows "⅙ cup" (half of ⅓).
- The two chips together represent the full ingredient quantity.

### Previous broken result (pre-fix)

- Each step showed "⅛ cup" (nearest eighth rounding of 0.1667) because `parseFloat("⅓")` returned `NaN`, the ratio defaulted to 1/1, and the full derived value was scaled incorrectly. With `parseFloat` path: siQty = `NaN` → defaults to 1, siTotal = `NaN` → defaults to 1, ratio = 1, so the full `derivedQty` = 0.333 was used per step instead of half. `formatQuantity(0.333)` = "⅓" (whole derived amount per step, not split). The exact wrong value depends on which fallback runs; the key is the split is incorrect.

---

## Scenario 8 — Range Servings: Recipe with "12–16 cookies" Shows Full Range in UI; Scaling Bases on First Number

**Bug reference:** Issue #8 — "recipe with '12–16 cookies' shows full range in UI; scaling from 12"

**Root cause context:** `parseServings` in `use-recipe-editor.ts` uses `s.match(/\d+/)` which grabs only the first digit group. For "12–16 cookies" it returns 12. The displayed serving count and any scaling should treat 12 as the base. The UI (ServingScaler pill) may strip the range and only show "12" — the test verifies the serving display shows the original text or the numeric base correctly, and that scaling from 12 produces correct proportions.

### Preconditions

- A recipe whose `servings` string is "12–16 cookies" (or equivalent range notation like "makes 12 to 16 servings") is loaded.

### Steps

1. Observe the Servings pill in the meta bar.
2. Note the displayed serving count.
3. Click the "+" button once (or type "24") to scale up.
4. Observe the ingredient quantities change.
5. Return to original serving count.

### Expected result (post-fix)

- The baseline serving count is **12** (the first number in the range).
- Scaling to 24 correctly doubles all ingredient quantities.
- The UI makes it clear that 12 is the starting baseline (e.g. the pill shows "12" as the current value, and scaling behaviour is proportional to 12, not some unexpected number).

### Previous broken result (pre-fix)

- If the range parsing was broken, the baseline might be `NaN` or 1 (the `parseServings` fallback), causing all scaling to be either broken (divide-by-zero producing NaN) or wildly off (scaling from 1 instead of 12).

---

## Scenario 9 — Reset Confirmation: First Tap Shows "Confirm?", Second Tap Resets

**Bug reference:** Issue #9 — "first tap shows 'Confirm?', second tap resets"

**Root cause context:** The "Reset" button in `recipe-card.tsx` currently calls `onResetAll` immediately on the first tap. There is no intermediate confirmation state. This scenario tests that the patch introduces a two-tap confirmation pattern to prevent accidental resets.

### Preconditions

- A recipe is loaded.
- At least one modification has been made (e.g. change serving count from original, or swap an ingredient) so the "Reset" button is visible.

### Steps

1. Confirm the "Reset" button is visible in the Ingredients header.
2. Tap/click "Reset" once.
3. Observe the button state.
4. Tap/click the button a second time.

### Expected result (post-fix)

- **After first tap:** The button label changes to "Confirm?" (or equivalent confirmation text). No reset occurs yet. Tapping elsewhere / moving away cancels confirmation and the button reverts to "Reset".
- **After second tap on "Confirm?":** All modifications are cleared — serving count returns to original, all ingredient overrides are removed, unit system returns to US. The "Reset" button disappears (since `isModified` is now false).

### Previous broken result (pre-fix)

- The first tap immediately wiped all modifications with no confirmation prompt. A misclick would silently destroy all edits with no recovery.

---

## Scenario 10 — No-op Swap: Open Swap Input, Close Without Change — No "(swapped)" Label

**Bug reference:** Issue #10 — "open swap, close without change → no '(swapped)' label appears"

**Root cause context:** In `IngredientRow`, `commitSwap` is called on blur or Enter. It calls `onItemChange(index, trimmed)` whenever `trimmed` is truthy. If the user opens the swap input (which is pre-filled with `ingredient.item`) and immediately presses Escape or blurs without changing the text, `trimmed` equals the original item name. The hook's `setIngredientItem` sets `wasSwapped: true` regardless. This causes the "(swapped)" indicator to appear even though nothing actually changed.

### Preconditions

- A recipe is loaded.
- No existing swaps (click "Reset" if needed).

### Steps

1. Hover over any ingredient row (on desktop) or find the swap icon button (arrows icon) on any ingredient.
2. Tap/click the swap icon. The swap input opens pre-filled with the ingredient name.
3. Do **not** change the text.
4. Press **Escape** (or click away / blur the input without modifying the text).

### Expected result (post-fix)

- The ingredient row returns to normal display with no "(swapped)" label.
- `wasSwapped` is **not** set. The ingredient has no override in `ingredientOverrides`.
- The "Reset" button does not appear.

### Previous broken result (pre-fix)

- The ingredient row would show "(swapped)" and the green highlighted item name, despite the ingredient name being identical to the original.
- The "Reset" button would appear, indicating a spurious modification.

---

## Scenario 11 — Count Ingredient Scaling: "2 lemons" Halved Shows "1 lemon" (Singular)

**Bug reference:** Issue #11 — "'2 lemons' halved → '1 lemon'"

**Root cause context:** Ingredient quantities scale numerically but the displayed unit/item string is not pluralised or singularised. "2 lemons" halved becomes "1 lemons" — the plural form of "lemons" remains even when the count is singular. The fix should apply a singularisation rule when the scaled quantity is exactly 1 (or between 0 and 2 non-inclusive) and the item name ends in a recognisable plural suffix.

### Preconditions

- A recipe with "2 lemons" (unit is empty, item is "lemons") is loaded. The original serving count is such that halving produces 1 lemon (e.g. original serving = 4, test at serving = 2).

### Steps

1. Load the recipe and confirm "2 lemons" is displayed (or a similar count-based ingredient like "4 eggs").
2. Halve the serving count using the "−" button in the Servings pill (or type half the original serving count directly).
3. Observe the ingredient row for lemons/eggs.

### Expected result (post-fix)

- "2 lemons" at 4 servings → "1 lemon" at 2 servings (singular).
- "4 eggs" at 4 servings → "2 eggs" at 2 servings (plural preserved correctly).
- The unit or item string is correctly singularised only when the displayed quantity is 1.

### Previous broken result (pre-fix)

- The ingredient displayed as "1 lemons" (incorrect plural) after halving, because the item name string was not adjusted based on the resulting quantity.

---

## Scenario 12 — Lab HUD Swapped Names: Swap "butter" → "oat milk"; Lab HUD Shows "oat milk"

**Bug reference:** Issue #12 — "swap 'butter' → 'oat milk', Lab HUD ingredient list shows 'oat milk'"

**Root cause context:** Identical to Issue #3 at the matching level, but this scenario emphasises the Lab HUD's per-step ingredient chips reflecting the swapped name (not just the scaled quantity). `patchedStepIngredients` matches by `d.item.toLowerCase() === si.item.toLowerCase()`. After swapping, `derivedIngredients` has `item: "oat milk"` but `recipe.stepIngredients` still stores `item: "butter"`. The match fails; the chip retains "butter". The fix should match on the **original** ingredient name when looking up in `derivedIngredients`, or build a mapping from original name → derived entry.

### Preconditions

- A recipe containing "butter" as an ingredient is loaded.
- Step-ingredient mapping has completed (oat milk likely won't be in the density table, so the unit should remain unchanged).
- In the recipe card, swap "butter" → "oat milk". Confirm the row shows "oat milk (swapped)".

### Steps

1. With "oat milk (swapped)" visible in the recipe card, click "Enter the Lab".
2. Navigate to a step that normally shows a "butter" chip.
3. Observe the chip label.

### Expected result (post-fix)

- The chip label reads **"oat milk"** (the swapped name).
- The quantity shown is the correctly scaled value (matching what the recipe card shows for "oat milk").

### Previous broken result (pre-fix)

- The chip still read "butter" with the original unscaled quantity, or was missing entirely, because the item-name lookup in `patchedStepIngredients` could not connect `si.item = "butter"` in `recipe.stepIngredients` to `d.item = "oat milk"` in `derivedIngredients`.

---

## Cross-cutting Checks (run after all 12 scenarios)

These quick checks confirm that the bug fixes did not introduce regressions in the core flows.

| Check | Steps | Expected |
|-------|-------|----------|
| **Basic parse** | Paste a recipe URL, click Extract Recipe | Recipe card renders with title, ingredients, instructions |
| **Lab navigation** | Enter Lab, swipe/tap forward through all steps | Each step advances; progress bar updates; "Finish Recipe" appears on last step |
| **Timer** | In Lab, reach a step with a time mention (e.g. "bake 25 minutes"), tap the timer pill | Timer counts down; toast fires on completion |
| **Serving scale round-trip** | Scale up by 3x then back to original | Quantities match original values exactly after returning to original |
| **Unit toggle round-trip** | Toggle to Metric then back to US | Quantities return to original US values |
| **Swap clear** | Swap an ingredient, then click the X (clear swap) button | Original ingredient name restored; "(swapped)" label gone; Reset button hidden if no other modifications |
| **Mobile tap zones** | On a mobile viewport (<640px), tap the right 40% of the Lab HUD | Advances to next step |
| **Screen wake lock** | Enter Lab, tap the lightbulb icon | Icon toggles; no crash |

---

## Test Environment Notes

- **Browser:** Chrome latest (primary), Safari latest (secondary for mobile simulation).
- **Viewport sizes to test:** 375×812 (iPhone 14 portrait), 1280×800 (desktop).
- **Network:** Normal — no throttling needed for these interaction-level tests.
- **No dev server required for plan review** — run `pnpm dev` only when executing tests.

---

---

# Recipe Lab AI — E2E / UX Manual Test Plan (v2.2 — Accounts & Auth)

**Scope:** User registration, login, MFA (TOTP), profile editing, protected routes, navigation state, and session persistence introduced in the v2.2 release.
**Testing framework:** Manual (no Playwright/Cypress configured).
**Entry point:** `http://localhost:3000` (`pnpm dev`).
**Auth provider:** NextAuth.js credentials provider with JWT sessions and MongoDB Atlas user store.
**MFA implementation:** TOTP via `otplib` — requires a real authenticator app (Google Authenticator, Authy, or 1Password) during MFA test scenarios.

---

## Setup Notes

### Test user accounts

Create two dedicated test accounts before running the suite. These accounts persist in MongoDB across runs; reset them manually via MongoDB Atlas or a `db.users.deleteOne({email: ...})` query if a test scenario requires a clean slate.

| Handle | Email | Password | Notes |
|--------|-------|----------|-------|
| `testuser` | `testuser@example.local` | `Test1234!` | Primary account; no MFA by default |
| `mfauser` | `mfauser@example.local` | `Test1234!` | Account with MFA pre-enabled |

### Password policy (from `src/app/api/auth/register/route.ts`)

The server enforces all four rules. Use them to construct weak-password negative test cases:
- Minimum 8 characters
- At least one uppercase letter (A–Z)
- At least one lowercase letter (a–z)
- At least one digit (0–9)

### Environment

Ensure `.env.local` has a valid `MONGODB_URI` and `NEXTAUTH_SECRET`. All auth tests require a running MongoDB connection. The `GEMINI_API_KEY` and `BROWSERLESS_API_KEY` are not required for auth tests.

---

## Section 1 — Registration Flow

---

### TC-REG-01: Happy path — successful registration

**Preconditions:**
- No existing account for `newuser+<timestamp>@example.local` (use a unique email each run, or delete the user before retesting).
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Confirm the page title is "Create an account".
2. Fill in Name: `Test User`.
3. Fill in Email: `newuser@example.local`.
4. Fill in Password: `Test1234!`.
5. Fill in Confirm password: `Test1234!`.
6. Click "Create account".

**Expected result:**
- The form disappears and is replaced by a success panel containing: a celebration emoji, the heading "Account created!", and a "sign in" link pointing to `/login`.
- No error message is shown.
- The MongoDB `users` collection contains a new document with the submitted email, `emailVerified` set to the current timestamp (auto-verified), `mfaEnabled: false`, `defaultUnitSystem: "us"`, and `preferredServings: null`.

**Edge cases:**
- The form should not submit if any required field is empty (browser-level `required` validation prevents it).
- Submitting twice in quick succession should only create one user (the second `POST /api/auth/register` returns 409 because the first already inserted the document).

---

### TC-REG-02: Duplicate email

**Preconditions:**
- `testuser@example.local` already exists in the database.
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Fill in Name: `Duplicate User`.
2. Fill in Email: `testuser@example.local`.
3. Fill in Password: `Test1234!`.
4. Fill in Confirm password: `Test1234!`.
5. Click "Create account".

**Expected result:**
- The form remains visible (does not navigate away).
- An inline error message appears in red: "An account with that email already exists."
- No new user document is created in MongoDB.

---

### TC-REG-03: Weak password — too short (fewer than 8 characters)

**Preconditions:**
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Fill in Name: `Test User`.
2. Fill in Email: `weakpass@example.local`.
3. Fill in Password: `Ab1!` (only 4 characters).
4. Fill in Confirm password: `Ab1!`.
5. Click "Create account".

**Expected result:**
- The form remains visible.
- An inline error appears: "Password must be at least 8 characters."
- No user is created.

---

### TC-REG-04: Weak password — missing uppercase letter

**Preconditions:**
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Fill in Name: `Test User`.
2. Fill in Email: `weakpass@example.local`.
3. Fill in Password: `test1234` (no uppercase).
4. Fill in Confirm password: `test1234`.
5. Click "Create account".

**Expected result:**
- Inline error: "Password must contain an uppercase letter."
- No user is created.

---

### TC-REG-05: Weak password — missing number

**Preconditions:**
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Fill in Name: `Test User`.
2. Fill in Email: `weakpass@example.local`.
3. Fill in Password: `TestPassword` (no digit).
4. Fill in Confirm password: `TestPassword`.
5. Click "Create account".

**Expected result:**
- Inline error: "Password must contain a number."
- No user is created.

---

### TC-REG-06: Mismatched passwords

**Preconditions:**
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Fill in Name: `Test User`.
2. Fill in Email: `mismatch@example.local`.
3. Fill in Password: `Test1234!`.
4. Fill in Confirm password: `Test5678!`.
5. Click "Create account".

**Expected result:**
- The mismatch check runs **client-side** (in `RegisterForm.handleSubmit`) before the network request is made.
- An inline error appears immediately: "Passwords do not match."
- No `POST /api/auth/register` request is sent (verify in the browser Network tab).
- No user is created.

---

### TC-REG-07: "Sign in" link from registration page

**Preconditions:**
- Navigate to `http://localhost:3000/register`.

**Steps:**
1. Click the "Sign in" link at the bottom of the form.

**Expected result:**
- Browser navigates to `/login`.
- The "Sign in" form is displayed.

---

## Section 2 — Login Flow

---

### TC-LOGIN-01: Happy path — successful login (no MFA)

**Preconditions:**
- `testuser@example.local` exists with password `Test1234!` and `mfaEnabled: false`.
- User is not currently signed in (or open an incognito window).
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Confirm the page title is "Sign in".
2. Fill in Email: `testuser@example.local`.
3. Fill in Password: `Test1234!`.
4. Click "Sign in".

**Expected result:**
- The browser navigates to `/` (the home page) — the `callbackUrl` defaults to `/`.
- The `UserNav` component in the header shows the user's initials avatar (e.g. "TU" for "Test User") instead of "Sign in / Sign up" links.
- No error message appears on the login form.
- A valid NextAuth JWT session cookie is set.

---

### TC-LOGIN-02: Wrong password

**Preconditions:**
- `testuser@example.local` exists.
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Fill in Email: `testuser@example.local`.
2. Fill in Password: `WrongPass99!`.
3. Click "Sign in".

**Expected result:**
- The form remains on `/login`.
- An inline error appears in red: "Invalid email or password."
- The user is **not** signed in; no session cookie is set.

**Edge cases:**
- The error message is intentionally generic (does not distinguish "wrong password" from "user not found") to prevent user enumeration.

---

### TC-LOGIN-03: Unregistered email

**Preconditions:**
- `nobody@example.local` does not exist in the database.
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Fill in Email: `nobody@example.local`.
2. Fill in Password: `Test1234!`.
3. Click "Sign in".

**Expected result:**
- Inline error: "Invalid email or password." (same message as TC-LOGIN-02).
- No session created.

---

### TC-LOGIN-04: Redirect to callbackUrl after login

**Preconditions:**
- User is not signed in.
- Navigate directly to `http://localhost:3000/profile`.

**Steps:**
1. Observe the redirect — the browser should land on `/login?callbackUrl=%2Fprofile`.
2. Sign in with `testuser@example.local` / `Test1234!`.
3. Click "Sign in".

**Expected result:**
- After successful login the browser navigates to `/profile` (the original destination), not to `/`.
- The profile page loads and shows the user's name and email.

---

### TC-LOGIN-05: "Sign up" link from login page

**Preconditions:**
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Click the "Sign up" link at the bottom of the form.

**Expected result:**
- Browser navigates to `/register`.
- The registration form is displayed.

---

### TC-LOGIN-06: Loading state during sign-in

**Preconditions:**
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Fill in valid credentials.
2. Click "Sign in" and immediately observe the button before navigation completes.

**Expected result:**
- The button label changes to "Signing in…" and the button becomes disabled while the `signIn("credentials", ...)` call is in flight.
- After the call resolves the button re-enables (or navigation occurs).

---

## Section 3 — MFA Flow

---

### TC-MFA-01: Enable MFA from profile (QR scan + verify)

**Preconditions:**
- Signed in as `testuser@example.local` with `mfaEnabled: false`.
- Navigate to `http://localhost:3000/profile`.
- An authenticator app is available (Google Authenticator, Authy, or 1Password).

**Steps:**
1. Scroll to the "Security" section.
2. Confirm the button "Enable authenticator app" is visible.
3. Click "Enable authenticator app".
4. Observe the UI transition: the button should change to "Setting up…" while the `POST /api/user/mfa/setup` request is in flight, then a QR code image (`<img alt="MFA QR code">`) appears along with a 6-digit input field.
5. Scan the QR code with the authenticator app.
6. Wait for the app to display a 6-digit code.
7. Type the 6-digit code into the input field (digits only; the input strips non-numerics).
8. Click "Confirm".

**Expected result:**
- The QR code and input form are replaced by a green dot with "Authenticator app enabled".
- `POST /api/user/mfa/verify` returns HTTP 200.
- In MongoDB, the user document has `mfaEnabled: true`, `mfaSecret` (base-32 string), and `mfaPendingSecret` is removed (`$unset`).
- The "Enable authenticator app" button does not reappear.

**Edge cases:**
- If the wrong code is entered, the error "Invalid code. Scan the QR again and retry." appears. The QR and input remain so the user can retry.
- The Confirm button is disabled until exactly 6 digits are entered.

---

### TC-MFA-02: Login with MFA enabled — valid code

**Preconditions:**
- `mfauser@example.local` exists with `mfaEnabled: true` and a valid `mfaSecret` stored in MongoDB.
- The authenticator app is configured with that user's secret.
- User is signed out.
- Navigate to `http://localhost:3000/login`.

**Steps:**
1. Sign in with `mfauser@example.local` / `Test1234!`.
2. Click "Sign in".
3. After the login call resolves, observe the redirect — the browser should land on `/verify-mfa` (enforced by the middleware in `src/proxy.ts`).
4. Open the authenticator app and get the current 6-digit code.
5. Enter the code into the input.
6. Click "Verify".

**Expected result:**
- `POST /api/user/mfa/verify` (mode: "login") returns HTTP 200.
- `useSession().update({ mfaVerified: true })` updates the JWT token.
- The browser navigates to `/` (via `router.push("/")`).
- Subsequent navigation to `/profile` does not redirect to `/verify-mfa` (session has `mfaVerified: true`).
- `UserNav` shows the user's avatar, confirming a fully authenticated session.

---

### TC-MFA-03: Login with MFA enabled — invalid code

**Preconditions:**
- Same as TC-MFA-02: `mfauser@example.local` with MFA enabled.
- Complete steps 1–3 of TC-MFA-02 to reach `/verify-mfa`.

**Steps:**
1. Enter an intentionally wrong 6-digit code (e.g. `000000`).
2. Click "Verify".

**Expected result:**
- `POST /api/user/mfa/verify` returns HTTP 401.
- The inline error "Invalid code. Please try again." appears in red.
- The browser remains on `/verify-mfa`.
- `mfaVerified` is not updated in the session.
- The user cannot access `/profile` or other routes while on `/verify-mfa`.

---

### TC-MFA-04: MFA gate — navigation to protected route while MFA pending

**Preconditions:**
- `mfauser@example.local` with MFA enabled is signed in but has **not** completed the `/verify-mfa` challenge (simulate by signing in and immediately trying to navigate elsewhere before the middleware redirect resolves).

**Steps:**
1. Sign in as `mfauser@example.local`.
2. Before entering the TOTP code, manually navigate to `http://localhost:3000/profile` in the address bar.

**Expected result:**
- The middleware (`src/proxy.ts`) detects `session.user.mfaEnabled === true` and `session.user.mfaVerified === false` and redirects to `/verify-mfa`.
- The user cannot access `/profile` until MFA is verified.

---

### TC-MFA-05: MFA setup — Confirm button disabled until 6 digits entered

**Preconditions:**
- Signed in as a user with `mfaEnabled: false`.
- On `/profile`, clicked "Enable authenticator app" — QR is visible.

**Steps:**
1. Observe the "Confirm" button with the token input empty.
2. Type 3 digits into the input.
3. Observe the button state.
4. Type 3 more digits (total 6).
5. Observe the button state.

**Expected result:**
- The Confirm button is `disabled` with fewer than 6 digits (enforced via `disabled={loading || token.length < 6}`).
- The button becomes enabled only when exactly 6 digits are present.
- Non-numeric characters cannot be typed (the `onChange` handler strips non-digits via `.replace(/\D/g, "")`).

---

### TC-MFA-06: MFA setup — error when no pending secret exists

**Preconditions:**
- Signed in as a user with `mfaEnabled: false` and `mfaPendingSecret` not set in MongoDB.

**Steps:**
1. Send `POST /api/user/mfa/verify` directly (via curl or Fetch in DevTools) with `{ token: "123456", mode: "setup" }`.

**Expected result:**
- API returns HTTP 400 with `{ error: "No MFA setup in progress" }`.
- This confirms the server requires `/mfa/setup` to be called first to store a `mfaPendingSecret` before `/mfa/verify` (mode: "setup") will succeed.

---

## Section 4 — Profile Flow

---

### TC-PROF-01: Update display name

**Preconditions:**
- Signed in as `testuser@example.local`.
- Navigate to `http://localhost:3000/profile`.

**Steps:**
1. In the "Account" section, clear the "Display name" field.
2. Type a new name: `Updated Name`.
3. Click "Save changes".

**Expected result:**
- The button shows "Saving…" while `PATCH /api/user/profile` is in flight.
- After the response, the button returns to "Save changes" and a "Saved!" confirmation appears in green next to the button.
- The field retains the new value `Updated Name`.
- The MongoDB `users` document has `name: "Updated Name"` and an updated `updatedAt` timestamp.
- The `UserNav` avatar initials update to reflect the new name on the next session refresh (may require a page reload).

---

### TC-PROF-02: Change unit system from US to Metric

**Preconditions:**
- Signed in. Navigate to `/profile`.
- The "US" pill is currently active (highlighted in green).

**Steps:**
1. Click the "Metric" pill button in the Preferences section.
2. Observe the visual state of both pills.
3. Click "Save changes".

**Expected result:**
- The "Metric" pill becomes active (green background, white text); the "US" pill becomes inactive (neutral border).
- After saving, a "Saved!" confirmation appears.
- MongoDB document has `defaultUnitSystem: "metric"`.
- Navigating away and back to `/profile` shows "Metric" still selected (the page server-renders with the value from the database).

---

### TC-PROF-03: Change preferred servings

**Preconditions:**
- Signed in. Navigate to `/profile`.

**Steps:**
1. In the Preferences section, click the "Preferred serving size" input.
2. Clear any existing value and type `4`.
3. Click "Save changes".

**Expected result:**
- "Saved!" confirmation appears.
- MongoDB document has `preferredServings: 4`.
- Navigating away and back to `/profile` shows `4` pre-filled in the servings input.

---

### TC-PROF-04: Clear preferred servings (set to blank)

**Preconditions:**
- Signed in. Navigate to `/profile`. User has `preferredServings: 4` set.

**Steps:**
1. Clear the "Preferred serving size" input field entirely.
2. Click "Save changes".

**Expected result:**
- "Saved!" confirmation appears.
- MongoDB document has `preferredServings: null` (the form sends `null` when the field is empty, per `parseInt(preferredServings) : null` logic in `ProfileForm`).

---

### TC-PROF-05: Profile save failure (network error)

**Preconditions:**
- Signed in. Navigate to `/profile`.
- Throttle the network to offline mode in DevTools.

**Steps:**
1. Change the display name to any value.
2. Click "Save changes".

**Expected result:**
- The button shows "Saving…" briefly.
- An inline error message appears in red: "Failed to save. Please try again."
- No "Saved!" text is shown.

---

### TC-PROF-06: Email field is read-only on profile page

**Preconditions:**
- Signed in. Navigate to `/profile`.

**Steps:**
1. Locate the email display under the "Account" section.

**Expected result:**
- The email is rendered as a static `<p>` element, not an `<input>`.
- There is no way to edit the email through this form (v2.2 does not support email changes).

---

### TC-PROF-07: Profile page inaccessible when signed out

**Preconditions:**
- User is signed out.

**Steps:**
1. Navigate directly to `http://localhost:3000/profile`.

**Expected result:**
- The server-side `auth()` call in `src/app/(protected)/profile/page.tsx` returns `null`.
- `redirect("/login")` fires, sending the browser to `/login`.
- The profile page content is never rendered.

---

## Section 5 — Protected Routes

---

### TC-ROUTE-01: Unauthenticated access to /profile redirects to /login

**Preconditions:**
- User is signed out (no session cookie present).

**Steps:**
1. Navigate to `http://localhost:3000/profile`.

**Expected result:**
- The middleware in `src/proxy.ts` detects `!session` for a path starting with `/profile`.
- Browser is redirected to `/login?callbackUrl=%2Fprofile`.
- The login form is shown with the URL containing the `callbackUrl` parameter.

---

### TC-ROUTE-02: Authenticated user can access /profile

**Preconditions:**
- `testuser@example.local` is signed in with `mfaEnabled: false`.

**Steps:**
1. Navigate to `http://localhost:3000/profile`.

**Expected result:**
- The page loads without any redirect.
- The user's name, email, and preferences are displayed correctly.
- The MFA "Security" section shows the "Enable authenticator app" button.

---

### TC-ROUTE-03: Public routes remain accessible when signed out

**Preconditions:**
- User is signed out.

**Steps:**
1. Navigate to `http://localhost:3000/` (home page).
2. Navigate to `http://localhost:3000/login`.
3. Navigate to `http://localhost:3000/register`.

**Expected result:**
- All three pages load without any redirect.
- The home page shows the recipe URL input.
- The login page shows the sign-in form.
- The register page shows the registration form.

**Note:** The middleware matcher excludes `api/auth`, `api/parse-recipe`, `api/map-ingredients`, and `api/parse-html`, so those API routes are also publicly accessible.

---

### TC-ROUTE-04: MFA-enabled user accessing any non-/verify-mfa route before TOTP challenge is redirected

**Preconditions:**
- `mfauser@example.local` (MFA enabled) has signed in but has **not** completed the TOTP challenge (session has `mfaVerified: false`).

**Steps:**
1. After signing in, attempt to navigate to `http://localhost:3000/` (home).

**Expected result:**
- The middleware detects `session.user.mfaEnabled === true` and `session.user.mfaVerified === false`.
- Browser redirects to `/verify-mfa`.
- This applies to all routes except `/verify-mfa` itself, `api/auth/*`, and the other excluded paths.

---

### TC-ROUTE-05: /verify-mfa is accessible while MFA is pending (no redirect loop)

**Preconditions:**
- `mfauser@example.local` signed in with MFA pending (not yet verified).

**Steps:**
1. Navigate to `http://localhost:3000/verify-mfa`.

**Expected result:**
- The TOTP challenge page renders successfully without being redirected again.
- The middleware allows `/verify-mfa` through even when `mfaVerified: false` (the redirect condition explicitly checks `pathname !== "/verify-mfa"`).

---

## Section 6 — Navigation (UserNav)

---

### TC-NAV-01: Signed-out state — "Sign in" and "Sign up" links visible

**Preconditions:**
- User is signed out.
- Navigate to `http://localhost:3000/`.

**Steps:**
1. Observe the header area where `UserNav` is rendered.

**Expected result:**
- A "Sign in" text link and a green "Sign up" pill button are displayed.
- No avatar or user initials are shown.
- While the session status is `"loading"`, a pulsing grey placeholder skeleton is shown briefly (the `animate-pulse` div), then resolves to the signed-out state.

---

### TC-NAV-02: Signed-in state — avatar and dropdown visible

**Preconditions:**
- `testuser@example.local` is signed in.
- Navigate to `http://localhost:3000/`.

**Steps:**
1. Observe the header.
2. Click the avatar button.

**Expected result:**
- A circular green avatar button displays the user's initials (e.g. "TU" for "Test User").
- Clicking the avatar opens a dropdown containing:
  - The user's full name (truncated if long).
  - The user's email address (truncated).
  - A "Profile" link with a settings icon.
  - A "Sign out" button with a logout icon.
- The dropdown closes when clicking outside it (the outside-click handler in `useEffect`).

---

### TC-NAV-03: Initials calculation

**Preconditions:**
- A user named `Alice Bob` is signed in.

**Steps:**
1. Observe the avatar button in the header.

**Expected result:**
- The avatar shows "AB" (first letter of each word, up to 2 initials, uppercased).

**Edge case — single name:**
- A user with name `Alice` (one word) should show "A".

**Edge case — no name, only email:**
- If `session.user.name` is falsy, the avatar falls back to the first character of the email uppercased (e.g. `testuser@...` → "T").

---

### TC-NAV-04: "Profile" link in dropdown navigates to /profile

**Preconditions:**
- Signed in. Avatar dropdown is open.

**Steps:**
1. Click the "Profile" item in the dropdown.

**Expected result:**
- The dropdown closes (`setOpen(false)` via the `onClick` handler on the Link).
- Browser navigates to `/profile`.
- The profile page renders with the user's data.

---

### TC-NAV-05: Sign out from dropdown

**Preconditions:**
- Signed in. Avatar dropdown is open.

**Steps:**
1. Click "Sign out" in the dropdown.

**Expected result:**
- `signOut({ callbackUrl: "/" })` is called.
- NextAuth invalidates the JWT session cookie.
- Browser navigates to `/`.
- The header now shows "Sign in / Sign up" links (signed-out state).
- Navigating to `/profile` redirects to `/login`.

---

### TC-NAV-06: Dropdown closes on outside click

**Preconditions:**
- Signed in. Avatar dropdown is open.

**Steps:**
1. Click anywhere outside the dropdown (e.g. the recipe URL input area).

**Expected result:**
- The dropdown closes without performing any action.
- The avatar button is still visible and clickable.

---

## Section 7 — Session Persistence

---

### TC-SESSION-01: Session survives page refresh

**Preconditions:**
- `testuser@example.local` is signed in (session cookie is set).
- Currently on `http://localhost:3000/`.

**Steps:**
1. Hard-refresh the page (Cmd+Shift+R / Ctrl+Shift+R).

**Expected result:**
- After the refresh, the `UserNav` shows the user's avatar (signed-in state).
- The user is not redirected to `/login`.
- The JWT session cookie persists because NextAuth uses `strategy: "jwt"` with a persistent cookie (default 30-day expiry).

---

### TC-SESSION-02: Session persists across browser tabs

**Preconditions:**
- `testuser@example.local` is signed in in Tab A.

**Steps:**
1. Open a new browser tab (Tab B).
2. Navigate to `http://localhost:3000/profile` in Tab B.

**Expected result:**
- Tab B loads `/profile` without redirecting to login.
- The same user's data is displayed.
- Both tabs share the same JWT cookie.

---

### TC-SESSION-03: Session is cleared after sign out and does not persist on refresh

**Preconditions:**
- `testuser@example.local` is signed in.

**Steps:**
1. Sign out via the `UserNav` dropdown (TC-NAV-05).
2. After landing on `/`, press Cmd+Shift+R to hard-refresh.

**Expected result:**
- After the refresh, the header shows "Sign in / Sign up" links.
- The session cookie has been removed or invalidated.
- Navigating to `/profile` redirects to `/login`.

---

### TC-SESSION-04: MFA verification persists for the session duration

**Preconditions:**
- `mfauser@example.local` is signed in and has completed the TOTP challenge (session has `mfaVerified: true`).

**Steps:**
1. Navigate to several pages: home (`/`), then `/profile`.
2. Hard-refresh the browser on `/profile`.

**Expected result:**
- After the refresh, the user is still fully authenticated and remains on `/profile` without being sent back to `/verify-mfa`.
- The `mfaVerified` flag is stored in the JWT token, so it survives the refresh.

---

## Cross-cutting Auth Checks

These quick checks confirm that v2.2 auth did not introduce regressions in the pre-existing recipe flows.

| Check | Steps | Expected |
|-------|-------|----------|
| **Recipe parse while signed in** | Sign in, paste a recipe URL on the home page, click Extract | Recipe card renders as normal; auth does not interfere with the parse flow |
| **Recipe parse while signed out** | Sign out, paste a recipe URL, click Extract | Recipe card renders; no login prompt is required for parsing (parse API is excluded from middleware) |
| **Lab mode while signed in** | Parse a recipe, click "Enter the Lab" | Lab view loads; timer and step navigation work normally |
| **Profile link from recipe page** | Sign in, parse a recipe, open `UserNav`, click Profile | Navigates to `/profile` without losing the currently parsed recipe state (recipe state is client-side; navigation preserves it via React state or would require re-parse) |
| **Session loading flicker** | On first load while signed in, observe `UserNav` | A brief grey pulse skeleton appears, then resolves to the avatar — no "Sign in" link flashes during loading |

---

## API Contract Checks (DevTools / curl)

These verify server behaviour independently of the UI.

| Endpoint | Method | Scenario | Expected Status | Expected Body |
|----------|--------|----------|-----------------|---------------|
| `/api/auth/register` | POST | Valid new user | 201 | `{ success: true }` |
| `/api/auth/register` | POST | Duplicate email | 409 | `{ error: "An account with that email already exists." }` |
| `/api/auth/register` | POST | Password too short | 400 | `{ error: "Password must be at least 8 characters" }` |
| `/api/auth/register` | POST | No uppercase | 400 | `{ error: "Password must contain an uppercase letter" }` |
| `/api/auth/register` | POST | No number | 400 | `{ error: "Password must contain a number" }` |
| `/api/user/profile` | PATCH | Unauthenticated | 401 | `{ error: "Unauthorized" }` |
| `/api/user/profile` | PATCH | Valid update | 200 | `{ success: true }` |
| `/api/user/profile` | PATCH | `preferredServings: 101` | 400 | Zod validation error message |
| `/api/user/mfa/setup` | POST | Unauthenticated | 401 | `{ error: "Unauthorized" }` |
| `/api/user/mfa/setup` | POST | Authenticated | 200 | `{ secret: "...", qrDataUrl: "data:image/png;..." }` |
| `/api/user/mfa/verify` | POST | Valid TOTP, mode: "setup" | 200 | `{ success: true }` |
| `/api/user/mfa/verify` | POST | Invalid TOTP, mode: "setup" | 401 | `{ error: "Invalid code" }` |
| `/api/user/mfa/verify` | POST | mode: "setup", no pending secret | 400 | `{ error: "No MFA setup in progress" }` |
| `/api/user/mfa/verify` | POST | Valid TOTP, mode: "login" | 200 | `{ success: true }` |
| `/api/user/mfa/verify` | POST | Invalid TOTP, mode: "login" | 401 | `{ error: "Invalid code" }` |

---

## v2.2 Test Environment Notes

- **Browser:** Chrome latest (primary). Safari is secondary — particularly important to verify the TOTP input's `inputMode="numeric"` triggers the numeric keyboard on iOS Safari.
- **Viewport sizes:** 375×812 (iPhone 14 portrait) and 1280×800 (desktop). The auth forms are constrained to `max-w-sm` centred containers and should be fully usable on both viewports.
- **Authenticator apps tested:** Google Authenticator (iOS/Android) and Authy (desktop). Both use RFC 6238 TOTP with 30-second windows and are compatible with `otplib`.
- **MongoDB required:** All auth tests hit the live database. Do not run these tests against a production database — use a separate Atlas cluster or local MongoDB instance configured via `.env.local`.
- **NextAuth secret:** `NEXTAUTH_SECRET` must be set consistently — changing it invalidates all existing JWT tokens, which will log out any active test sessions.
- **Time sync:** TOTP codes are time-sensitive (30-second window). Ensure the test machine's clock is accurate (NTP-synced). If codes consistently fail verification, check for clock skew between the test machine and the server.

---

---

# Recipe Lab AI — E2E / UX Manual Test Plan (v2.2 post-release bugs & v2.3 Library)

**Scope:** Resolved issues #13–21 (and unnumbered peers #15, #17, #18, #20) — covering Lab HUD step-text swaps, unit preference persistence, swap hit targets, scaled inline step quantities, profile field cleanup, home-page auth nav, Lab completion save, and library state restoration.
**Testing framework:** Manual (no Playwright/Cypress configured).
**Entry point:** `http://localhost:3000` (`pnpm dev`).
**Prerequisites:** A valid `.env.local` with `GEMINI_API_KEY`, `MONGODB_URI`, and `AUTH_SECRET`. Use `testuser@example.local` / `Test1234!` from the v2.2 test suite as the primary authenticated account throughout. A recipe that reliably parses (e.g. the AllRecipes chocolate chip cookies URL from the v2.1 setup note) should be loaded before running interactive scenarios.

---

## Scenario 13 — Lab HUD Step Text: Swapped Ingredient Name Appears in Instruction Body

**Bug reference:** Issue #13 — "swap 'butter' → 'oat milk'; Lab HUD step text still says 'butter'"

**Root cause context:** `LabView` was reading `recipe.instructions` (raw strings from the AI) instead of `derivedInstructions` from the editor hook. The editor already applies swaps and temperature conversions when building `derivedInstructions`; passing the raw array caused the step body text to show the original, un-swapped ingredient names even after the swap was applied in the recipe card.

### Preconditions

- A recipe containing "butter" in at least one instruction step is loaded (the AllRecipes cookie URL works — step text mentions butter).
- Step-ingredient mapping has completed (loading indicator gone).
- In the recipe card, tap the swap icon (↔) next to "butter", type `oat milk`, press Enter. Confirm the row shows "oat milk (swapped)".

### Steps

1. Click "Enter the Lab".
2. Navigate through Lab steps until a step whose body text originally mentions "butter".
3. Read the step instruction text carefully.

### Expected result (post-fix)

- The step body text reads "oat milk" (or the surrounding sentence uses "oat milk") — the swap is reflected in the instruction prose.
- The step ingredient chip also shows "oat milk" (covered by earlier Scenario 3 / Issue #3, but re-confirm).

### Previous broken result (pre-fix)

- Step body text still contained "butter" even though the recipe card showed "oat milk (swapped)". The Lab and the recipe card were inconsistent.

---

## Scenario 14 — Unit Preference: Logged-in User's Saved Unit System Applied on Recipe Load

**Bug reference:** Issue #14 — "saved 'Metric' preference not applied when a new recipe is parsed; always loads as US"

**Root cause context:** `useRecipeEditor` defaulted `unitSystem` to `"us"` unconditionally. `HomePage` did not fetch the user's profile on sign-in. Adding an `initialUnitSystem` option to the hook and passing the value from `GET /api/user/profile` on login resolves the mismatch.

### Preconditions

- `testuser@example.local` is signed in.
- Navigate to `/profile`, set unit system to **Metric**, click "Save changes". Confirm "Saved!".

### Steps

1. Navigate to `http://localhost:3000/` (the home page).
2. Paste a recipe URL and click "Extract Recipe".
3. Wait for the recipe card to render.
4. Observe the unit toggle in the Ingredients header.

### Expected result (post-fix)

- The unit toggle reads "Metric" immediately on first render — the user's saved preference is applied without manual toggling.
- All ingredient quantities are displayed in metric units (g, ml) from the start.

### Previous broken result (pre-fix)

- The toggle always showed "US" regardless of the saved preference. Users had to toggle to Metric on every recipe load.

---

## Scenario 15 — Swap Hit Targets: Swap and Clear-Swap Buttons Are at Least 44 × 44 px on Mobile

**Bug reference:** Issue #15 — "swap/clear-swap tap targets too small on mobile"

### Preconditions

- A recipe is loaded.
- Open Chrome DevTools → Device Toolbar → set viewport to 375 × 812 (iPhone 14).

### Steps

1. Hover over (or long-press) an ingredient row to reveal the swap icon (↔).
2. Using the DevTools element inspector, select the swap `<button>` element.
3. Read its computed `width` and `height` in the Styles / Layout panel.
4. Tap the swap button to open the swap input.
5. After swapping an ingredient (e.g. "butter" → "coconut oil"), inspect the clear-swap button (×).
6. Read its computed `width` and `height`.

### Expected result (post-fix)

- Both the swap trigger button and the clear-swap button have `min-height: 44px` and `min-width: 44px` applied (via `min-h-[44px] min-w-[44px]` Tailwind classes).
- Tapping either button is reliably responsive without needing to tap multiple times.

### Previous broken result (pre-fix)

- The icon buttons were ~24 × 24 px — standard icon-button size — making them difficult to hit on mobile without a stylus or precise tapping.

---

## Scenario 16 — Scaled Quantities in Lab Step Text: "Add 2 cups broth" Scales to "4 cups" at 2× Servings

**Bug reference:** Issue #16 — "inline quantities in Lab step text don't update when serving size is scaled"

**Root cause context:** Fixed as part of Issue #13 — `derivedInstructions` is produced by the editor hook applying scaling-aware text replacement; once `LabView` receives `derivedInstructions` instead of `recipe.instructions`, the scaling-substituted text is automatically used.

### Preconditions

- A recipe with inline quantities in at least one step (e.g. "Pour 1 cup of broth into the pan") is loaded.
- Original serving count is noted (e.g. 4).

### Steps

1. In the recipe card, double the serving count (e.g. from 4 to 8).
2. Confirm ingredient quantities in the recipe card have doubled.
3. Click "Enter the Lab".
4. Navigate to the step that references the quantity in its text.
5. Read the inline quantity in the step prose.

### Expected result (post-fix)

- The inline quantity in the step text is doubled (e.g. "Pour 2 cups of broth into the pan").
- The step ingredient chip for broth also shows the doubled quantity.

### Previous broken result (pre-fix)

- The step text still said "1 cup" even after scaling to 8 servings, while the recipe card showed the correct doubled value.

---

## Scenario 17 — Profile: No "Preferred Serving Size" Field

**Bug reference:** Issue #17 — "'Preferred serving size' removed from profile; serving size is recipe-specific"

### Preconditions

- `testuser@example.local` is signed in.
- Navigate to `http://localhost:3000/profile`.

### Steps

1. Read the entire Preferences section of the profile form.
2. Check for any field labelled "Preferred serving size", "Default servings", or similar.

### Expected result (post-fix)

- No "Preferred serving size" input exists anywhere on the profile page.
- The Preferences section contains only the unit system toggle (US / Metric).

### Previous broken result (pre-fix)

- A "Preferred serving size" number input was visible and saved `preferredServings` to the database, even though serving size is recipe-specific and the field had no effect on recipe load behaviour at the time.

---

## Scenario 18 — Home Page Auth: "Sign in" and "Sign up" Links in Hero Header

**Bug reference:** Issue #18 — "no login or signup option on the home page"

### Preconditions

- User is signed out.
- Navigate to `http://localhost:3000/`.

### Steps

1. Look at the header area of the hero/landing state (the page with the URL input).
2. Identify auth navigation elements.

### Expected result (post-fix)

- The `UserNav` component is rendered in the hero-state header.
- When signed out, a "Sign in" text link and a green "Sign up" pill button are visible.
- Clicking "Sign in" navigates to `/login`; clicking "Sign up" navigates to `/register`.

### Previous broken result (pre-fix)

- The home page had no login or signup affordance in the hero state. Users had to know the `/login` or `/register` URL directly.

---

## Scenario 19 — Lab Completion Save: "Save Recipe" Button on Finish Screen

**Bug reference:** Issue #20 — "no save affordance on the Lab completion screen"

**Note:** The issue was filed as #20 in FEEDBACK.md; this scenario is numbered 19 in this test plan for sequential ordering.

### Preconditions

- `testuser@example.local` is signed in.
- A recipe is loaded, ingredients are modified: scale to 2× servings, swap one ingredient (e.g. "butter" → "vegan butter"), set unit system to Metric.
- Step-ingredient mapping has completed.

### Steps

1. Click "Enter the Lab".
2. Navigate through all steps until the completion screen ("Enjoy!") appears.
3. Observe the buttons on the completion screen.
4. Click "Save Recipe".
5. Wait for the response.

### Expected result (post-fix)

- A "Save Recipe" outline button is visible on the completion screen alongside "View Full Recipe".
- Clicking "Save Recipe":
  - The button label changes to "Saving…" while the `POST /api/library` request is in flight.
  - On success, the button label changes to "Saved!" and becomes disabled (cannot save again).
  - `GET /api/library` (if called) returns the saved recipe including the scaled `servings` (2×), the ingredient swap, and `unitSystem: "metric"`.
- If the save fails (e.g. sign the user out mid-session and retry), an inline error "Sign in to save" or "Failed to save" appears in red below the button.

### Previous broken result (pre-fix)

- The completion screen only showed "View Full Recipe" (and "Back to Last Step" on desktop). There was no way to save from the completion screen.

---

## Scenario 20 — Lab Completion Save: Signed-Out User Sees "Sign in to save" Error

**Bug reference:** Issue #20 (continuation) — sign-out edge case for the Save Recipe button.

### Preconditions

- User is **signed out** (or open an incognito window, navigate to the home page, parse a recipe without signing in).
- Load a recipe and complete the Lab.

### Steps

1. On the completion screen, click "Save Recipe".

### Expected result (post-fix)

- `POST /api/library` returns HTTP 401.
- The button returns to "Save Recipe" (not stuck on "Saving…").
- An inline error message "Sign in to save" appears in red below the button.
- The button is re-enabled so the user can try again after signing in.

### Previous broken result (pre-fix)

- No save button existed (see Scenario 19); this edge case was also unhandled.

---

## Scenario 21 — Library State Restoration: Saved Swaps, Servings, and Unit System Hydrated on Re-load

**Bug reference:** Issue #21 — "loading a saved recipe from the library does not restore swaps, servings, or unit system"

**Root cause context:** `useRecipeEditor` lacked `initialServings`, `initialUnitSystem`, and `initialIngredientSwaps` options. When `HomePage` loaded a recipe from `GET /api/library/:id`, it only populated `recipe` — the editor initialised with defaults (4 servings, US, no swaps). The fix passes the saved values via `editorOptions` props to `RecipeView`.

### Preconditions

- `testuser@example.local` is signed in.
- A recipe has been saved previously (use Scenario 19 to create one) with these editor modifications:
  - Servings scaled to **8**.
  - Ingredient swap: "butter" → "coconut oil".
  - Unit system: **Metric**.

### Steps

1. Navigate to the library (however the library entry point is accessible — header link or `/library` route if it exists, or use the home page list).
2. Click the saved recipe to load it.
3. Observe the recipe card state immediately on render.

### Expected result (post-fix)

- The serving count pill shows **8** (the saved value), not the recipe's original serving count.
- The unit toggle reads **Metric** (the saved unit system).
- The ingredient row previously swapped shows "coconut oil (swapped)" — the swap is applied.
- Scaling the serving count from 8 further applies the scale factor on top of the restored state correctly.

### Previous broken result (pre-fix)

- The recipe card loaded with the original serving count (e.g. 4), US units, and no swaps visible — as if the user's editor state had never been saved.

---

## Cross-cutting Checks (run after all scenarios above)

| Check | Steps | Expected |
|-------|-------|----------|
| **Save overwrites duplicate** | Save the same recipe URL twice (load it, finish Lab, save; then load the same URL again, finish Lab, save again) | The second `POST /api/library` returns `{ updated: true }` — the document is overwritten, not duplicated. The library shows one entry, not two. |
| **Unit pref + swap round-trip** | Set profile to Metric, parse a recipe, swap an ingredient, finish Lab, save, reload from library | All three states (metric, swap, scaled servings) are restored correctly in one load. |
| **Lab step text consistency** | Swap an ingredient; recipe card and Lab step text both show the new name | No divergence between recipe card and Lab step text for the same swap. |
| **Completion screen on mobile** | On 375 × 812 viewport, complete a Lab run | Completion screen is fully visible, "Save Recipe" button is tappable (min 44 × 44 px), "View Full Recipe" button works. |
| **Regression: parse while signed in** | Sign in, parse a recipe URL | Recipe card renders normally; saving state does not interfere with parsing. |
| **Regression: profile page after removing serving field** | Navigate to `/profile` while signed in | Page loads without error; no reference to a removed `preferredServings` field in the network response or UI. |

---

## API Contract Checks (DevTools / curl) — v2.3 Library

| Endpoint | Method | Scenario | Expected Status | Expected Body |
|----------|--------|----------|-----------------|---------------|
| `/api/library` | POST | Valid save, authenticated | 201 | `{ id: "<ObjectId>" }` |
| `/api/library` | POST | Duplicate source URL, same user | 200 | `{ id: "<ObjectId>", updated: true }` |
| `/api/library` | POST | Unauthenticated | 401 | `{ error: "Unauthorized" }` |
| `/api/library` | POST | Invalid body (missing `recipe.title`) | 400 | `{ error: "Invalid data", issues: [...] }` |
| `/api/library` | GET | Authenticated | 200 | Array of `{ _id, title, source, totalTime, servings, savedAt }` |
| `/api/library` | GET | Unauthenticated | 401 | `{ error: "Unauthorized" }` |
| `/api/library/:id` | GET | Valid id, owner | 200 | Full saved recipe document |
| `/api/library/:id` | GET | Valid id, different user | 403 or 404 | Error response |
| `/api/library/:id` | GET | Unauthenticated | 401 | `{ error: "Unauthorized" }` |

---

## Test Environment Notes

- **Auth required:** All library and unit-preference scenarios require an authenticated session. Use `testuser@example.local` / `Test1234!`.
- **MongoDB required:** Library save/restore tests write to the `savedRecipes` collection. Use the same Atlas cluster or local MongoDB instance as the v2.2 suite.
- **Recipe state:** Many scenarios depend on having a parsed recipe loaded. Use the AllRecipes chocolate chip cookies URL from the v2.1 setup note, or any recipe that parses cleanly.
- **Browser:** Chrome latest (primary). Safari latest (secondary — verify Metric display on iOS Safari).
- **Viewport:** 375 × 812 for mobile checks; 1280 × 800 for desktop.
