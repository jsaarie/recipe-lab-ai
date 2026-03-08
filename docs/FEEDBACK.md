# Recipe Lab AI — Feedback Log

A running list of issues, observations, and improvement notes from human testing. Items should be triaged and resolved by the team.

## Status Key

- `open` — not yet addressed
- `in progress` — actively being worked on
- `resolved` — fixed or closed (include PR/commit ref if applicable)
- `wontfix` — acknowledged but intentionally not addressing

---

## Open

| # | Date | Feature / Area | Feedback | Status | Notes |
|---|------|----------------|----------|--------|-------|

---

## Resolved

| # | Date | Feature / Area | Feedback | Resolution | PR / Commit |
|---|------|----------------|----------|------------|-------------|
| — | 2026-02-25 | Recipe Editing v2.1 | 5 documented bugs: unicode fraction misparsed, thirds snap to ⅜, ML_PER_UNIT missing fl oz/pt/qt/gal, qtyDraft stale after scaling, parseFloat truncates fractions in Lab HUD split-quantity calc | All 5 fixed. 29/29 unit tests pass. `tsc` and `lint` clean. | v2.1 patch (aa5d2dd branch) |
| 1 | 2026-02-25 | Unit Conversion — Ingredient Edit | When unit conversion is active and a user edits a pinned quantity, the system interprets the typed number in the original US unit, not the displayed metric unit. | `applyConversion` updated to carry the converted unit into the override so edits are interpreted in the displayed unit. | v2.1.1 patch |
| 2 | 2026-02-25 | Lab HUD — Smart Ingredients | Step ingredient name matching used case-insensitive string equality only; minor variations (e.g. hyphen vs space) caused silent mismatches showing unscaled original quantities. | Matching normalised to strip hyphens and collapse extra whitespace before comparison. | v2.1.1 patch |
| 3 | 2026-02-25 | Lab HUD — Smart Ingredients | Swapped ingredients not reflected in Lab HUD; `patchedStepIngredients` matched by original item name, so post-swap name change broke the lookup. | Matching now falls back to index-based lookup when name matching fails, ensuring swapped ingredients are correctly resolved. | v2.1.1 patch |
| 4 | 2026-02-25 | Unit Conversion — Density Path | Density-based weight conversion (`volumeToGrams`) was dead code — `convertUnit` always succeeded for standard US volume units and returned early, so "1 cup flour" converted to 237 ml instead of 120 g. | `applyConversion` now attempts density-based weight conversion before falling through to direct volume conversion on the metric path. | v2.1.1 patch |
| 5 | 2026-02-25 | Ingredient Quantity Edit | Tapping a quantity field and immediately committing without changing the value silently created an override that pinned the ingredient, excluding it from future scaling. | `commitQty` in `recipe-card.tsx` now skips `onQuantityChange` when the draft value is identical to the current displayed quantity (no-op commit). | v2.1.1 patch |
| 6 | 2026-02-25 | Unit Conversion — Display | Metric quantities displayed with Unicode fraction characters (e.g. "473⅛ ml"); metric users expect whole numbers or decimals. | Added `formatMetricQuantity` to `fractions.ts` that rounds to one decimal place instead of snapping to fractions; metric path now uses this formatter. | v2.1.1 patch |
| 7 | 2026-02-25 | Lab HUD — Split Quantities | Pre-snap `Math.round(scaledQty * 8) / 8` in `lab-view.tsx` ran before `formatQuantity`, neutralising the thirds/sixths snapping added in the v2.1 patch and causing "1/3 cup" to display as ⅜ in the Lab. | Pre-snap removed; `scaledQty` is now passed directly to `formatQuantity`. | v2.1.1 patch |
| 8 | 2026-02-25 | Serving Size Scaling | Range-style servings strings (e.g. "12–16 cookies") silently parsed as the first number only; scale factor was computed from 12 with no user indication. | `parseServings` updated to detect range strings and display the full range in the scaler UI while using the lower bound as the baseline. | v2.1.1 patch |
| 9 | 2026-02-25 | Recipe Editing — Reset | No confirmation before the destructive Reset action; one tap cleared all serving size, quantity pin, swap, and unit changes with no undo. | A confirmation toast with an "Undo" action now appears for 4 seconds after Reset is triggered before the state is discarded. | v2.1.1 patch |
| 10 | 2026-02-25 | Ingredient Swap — No-op | Opening the swap field and closing it without changing the value marked the ingredient as swapped (visual indicator appeared incorrectly). | Swap state is now only applied when the submitted value differs from the original ingredient name. | v2.1.1 patch |
| 11 | 2026-02-25 | Serving Size Scaling — Count Items | Unitless count ingredients (e.g. "2 lemons", "3 eggs") did not scale when serving size changed because the scaling path required a recognised unit. | Scaling path now detects unitless count ingredients and applies the scale factor directly to the quantity. | v2.1.1 patch |
| 12 | 2026-02-25 | Lab HUD — Swapped Ingredient Names | Ingredient name swaps made in the recipe editor were not reflected in the Lab HUD ingredient list; the Lab resolved names from the original parsed recipe. | Active swaps map is now passed into the Lab ingredient list resolver so swapped names are displayed correctly. | v2.1.1 patch |
| 15 | 2026-02-26 | Ingredient Swap — Hit Targets | Tap/click targets for triggering an ingredient swap are too small on mobile. | Swap and clear-swap buttons now use `min-h-[44px] min-w-[44px]` with centered content. | — |
| 17 | 2026-03-05 | User Profile — Serving Size | "Preferred serving size" setting removed from profile; serving size is recipe-specific. | Removed field from ProfileForm, profile page, API schema, and PATCH body. | — |
| 18 | 2026-03-05 | Home Page — Authentication | No login or signup option on the home page. | Added UserNav to the hero state header. | — |
| 20 | 2026-03-07 | Lab HUD — Save on Completion | No save affordance on the completion screen. | Added Save Recipe button to LabComplete; passes servings, swaps, and unit system from editor state. | — |
| 13 | 2026-02-26 | Ingredient Swap — Lab HUD | Swapped ingredient names not reflected in Lab HUD step text after v2.1.1 patch. | `LabView` now receives `derivedInstructions` from the editor (which applies swaps and temperature conversions) instead of reading raw `recipe.instructions`. | — |
| 14 | 2026-02-26 | User Profile — Unit Preference | Saved unit system preference not applied on recipe load; always defaulted to US. | `useRecipeEditor` now accepts `initialUnitSystem` option; `HomePage` fetches `GET /api/user/profile` on login and passes `defaultUnitSystem` as the initial value. | — |
| 16 | 2026-02-26 | Lab HUD — Scaled Quantities in Instructions | Inline quantities in step text not updated when serving size is scaled. | Fixed as part of #13 — `derivedInstructions` is passed into `LabView`, which already applies scaling-aware text via the editor's derived state. | — |
| 21 | 2026-03-07 | Library — Swaps Not Restored on Load | `ingredientSwaps`, `servings`, and `unitSystem` from saved recipe not hydrated into editor on load. | `useRecipeEditor` accepts `initialServings`, `initialUnitSystem`, and `initialIngredientSwaps` options; `HomePage` populates these from `GET /api/library/:id` response and passes them via `editorOptions` prop to `RecipeView`. | — |

---

## How to Add Feedback

1. Add a new row to the **Open** table.
2. Assign the next available `#`.
3. Fill in the `Date` (YYYY-MM-DD), the `Feature / Area` (e.g. "Serving Size Scaling", "URL Parser"), and describe the `Feedback` clearly.
4. Leave `Status` as `open` until someone picks it up.
5. When resolved, move the row to the **Resolved** table and add the resolution summary and PR/commit reference.
