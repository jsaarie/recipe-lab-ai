# Recipe Lab AI — UI Redesign Plan

A phased plan to elevate the UI from functional to polished, modern, and delightful while keeping the warm kitchen-friendly aesthetic.

**Design Style:** Nature Distilled — muted earthy tones, organic warmth, handmade feel
**Target:** WCAG AA accessible, mobile-first, consistent design system

---

## Phase 1: Design Foundation ✅ COMPLETE

> Establish the theme system so all subsequent phases build on a solid base.

### 1.1 — Color System Refactor ✅
- [x] Wire sage green (`#7C9070`) into CSS custom properties (`--primary`)
- [x] Map brand colors to shadcn theme variables (`--primary`, `--accent`, `--background`, etc.)
- [x] Define full palette: `sage-50` through `sage-900` + `warm-50` through `warm-900` Tailwind scales
- [x] Update `:root` and `.dark` blocks in `globals.css` with warm hex values
- [x] Replace **79 hardcoded color references** across **20 component files** with theme classes
  - `bg-[#FAF8F5]` → `bg-background`
  - `text-[#7C9070]` → `text-primary`
  - `text-neutral-*` → `text-warm-*`
  - All opacity/border/hover variants migrated

### 1.2 — Typography Upgrade ✅
- [x] Replaced Geist Sans with **Lora** (serif, headings) + **DM Sans** (sans, body)
- [x] Added Google Fonts import in `layout.tsx` via `next/font/google`
- [x] Defined `--font-heading` (Lora) and `--font-body` (DM Sans) CSS variables
- [x] Applied `font-serif` to all major headings (Recipe Lab AI logo, recipe titles, page titles)
- [x] Kept Geist Mono for code/technical contexts

### 1.3 — Install Missing shadcn Components ✅
- [x] Installed: Card, Badge, Separator, Skeleton, Avatar, DropdownMenu
- [ ] Wire up components into existing UI (deferred to Phase 2–5 as each page is redesigned)

### 1.4 — Dead Logo Links Fix ✅
- [x] `home-page.tsx` sticky header: `<span>` → `<Link href="/">`
- [x] `(auth)/layout.tsx`: `<span>` → `<Link href="/">`
- [x] `library/page.tsx`: `<a href="/">` → `<Link href="/">` (both loading + main states)
- [x] `profile/page.tsx`: already had `<Link>` — no change needed

**Files touched:** `globals.css`, `layout.tsx`, `home-page.tsx`, `recipe-card.tsx`, `recipe-input.tsx`, `lab-banner.tsx`, `lab-view.tsx`, `lab-complete.tsx`, `step-timer.tsx`, `step-ingredients.tsx`, `timer-toast.tsx`, `user-nav.tsx`, `login-form.tsx`, `register-form.tsx`, `profile-form.tsx`, `mfa-setup.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `cookbook-upload.tsx`, `(auth)/layout.tsx`, `library/page.tsx`, `profile/page.tsx`

---

## Phase 2: Hero & Landing Page ✅ COMPLETE

> Make the first impression count — warm, inviting, and clear.

### 2.1 — Hero Section Redesign ✅
- [x] Add subtle background texture or grain overlay for warmth
- [x] Larger, more expressive heading with serif font (from Phase 1)
- [x] Warmer subheading copy with better hierarchy
- [x] Animate hero entrance with a gentle fade-up (respect `prefers-reduced-motion`)
- [x] Add subtle decorative element (herb illustration SVG shapes)

### 2.2 — Input Bar Polish ✅
- [x] Add a subtle inner shadow or border glow on focus (`input-glow` class)
- [x] Better placeholder text styling
- [x] Mobile: show submit button inline (arrow icon on mobile, "Cook" on desktop)
- [x] Add active/pressed state on the "Cook" button (`active:scale-[0.97]`)

### 2.3 — Loading State ✅
- [x] Replace plain spinner + text with a skeleton preview of a recipe card
- [x] Add animated progress text ("Fetching page… Extracting recipe… Almost done…")
- [x] Keep the brand logo visible during loading

### 2.4 — Below-the-Fold Content ✅
- [x] Add a "How it works" section: 3 steps with icons (Paste → Extract → Cook)
- [ ] Brief feature highlights (Lab Mode, Save Recipes, Scale Ingredients) — deferred
- [x] Only visible on the hero/landing — hidden once a recipe is loaded

**Files touched:** `home-page.tsx`, `recipe-input.tsx`, `globals.css`

---

## Phase 3: Recipe Card Polish ✅ COMPLETE

> The core experience — make the parsed recipe feel premium and easy to read.

### 3.1 — Card Container ✅
- [x] Wrap recipe content in a proper `<Card>` with subtle shadow and rounded corners
- [x] Add a soft sage gradient accent at the top of the card
- [x] Better spacing between title, meta, ingredients, and instructions

### 3.2 — Meta Pills Upgrade ✅
- [x] Use `<Badge variant="secondary">` from shadcn
- [x] Add small icons before labels (clock for time, users for servings)
- [x] Improve the serving scaler with better +/- buttons (larger touch targets, clearer styling)

### 3.3 — Ingredients Section ✅
- [x] Add a subtle left border to the ingredients area
- [x] Better checkbox styling (custom sage green checkmark)
- [x] Strikethrough animation on check (`ingredient-checked` CSS class)
- [x] Swap/edit buttons: icon buttons with `aria-label` tooltips

### 3.4 — Instructions Section ✅
- [x] Larger step numbers with better visual weight
- [x] Add a subtle connecting line between step numbers (timeline feel)
- [x] Improve text readability with proper `max-w-prose` line length

### 3.5 — Save Button & Source Link ✅
- [x] Style save button with active press state
- [ ] Add a toast/notification on save success instead of inline text — deferred
- [x] Better "View original" link styling (external link icon)

**Files touched:** `recipe-card.tsx`, `globals.css`

---

## Phase 4: Library Page ✅ COMPLETE

> Make the saved recipes feel like a personal cookbook.

### 4.1 — Page Layout ✅
- [x] Add a warm page header with the user's name ("Sarah's Library")
- [x] Better empty state: illustration + warm copy + CTA to paste first recipe
- [x] Recipe count badge in the header

### 4.2 — Recipe Cards ✅
- [x] Switch from simple list items to richer cards using `<Card>` component
- [x] Add recipe thumbnail/placeholder image (generate from recipe title colors)
- [x] Show more metadata: total time, servings with badges
- [x] Better hover effect: lift + shadow (`card-hover` CSS class)
- [x] Add `cursor-pointer` to clickable cards

### 4.3 — Actions ✅
- [x] Better delete confirmation (two-tap inline confirm instead of `confirm()`)
- [x] Add a search/filter bar at the top of the library
- [x] Sort options: newest, alphabetical, cook time

**Files touched:** `(protected)/library/page.tsx`, `globals.css`

---

## Phase 5: Auth Pages ✅ COMPLETE

> Warm and welcoming — not cold corporate forms.

### 5.1 — Login Page ✅
- [x] Add the Recipe Lab AI logo and tagline above the form
- [x] Use `<Card>` component for the form container
- [x] Warmer border color (sage instead of neutral-200)
- [x] Add a subtle background pattern behind the card (grain overlay + herb SVGs)
- [x] Better error state styling (shake animation, colored border)

### 5.2 — Register Page ✅
- [x] Match login page styling
- [x] Add password strength indicator (5-segment bar with Weak/Fair/Good/Strong)
- [x] Better field validation feedback (inline password mismatch, styled error banners)

### 5.3 — Profile Page ✅
- [x] Better section organization with cards (Account, Preferences, Security)
- [x] MFA setup section with clearer visual hierarchy (lock icon, Card wrapper)
- [x] User avatar area (initials-based avatar with profile header)

**Files touched:** `(auth)/layout.tsx`, `login-form.tsx`, `register-form.tsx`, `profile-form.tsx`, `mfa-setup.tsx`, `profile/page.tsx`

---

## Phase 6: Global Polish & Micro-interactions ✅ COMPLETE

> The finishing touches that make it feel alive.

### 6.1 — Transitions & Animations ✅
- [x] Button press states: `active:scale-[0.98]` on all buttons (added to base Button component)
- [x] Hover states: `cursor-pointer` on all clickable elements
- [x] Respect `prefers-reduced-motion` for all animations (consolidated media query)
- [ ] Page transitions: subtle fade between hero → recipe card states — deferred
- [ ] Smooth accordion-style expand/collapse for sections — deferred

### 6.2 — Sticky Header Polish ✅
- [x] Add a thin sage-green top border accent line (gradient)
- [x] Subtle shadow that appears only when scrolled (`shadow-sm` on scroll)
- [x] Applied consistently across home, library, and profile pages

### 6.3 — Responsive Audit ✅
- [x] Ensure touch targets are minimum 44px (servings +/- buttons h-7→h-9, photo retake p-1→p-2)
- [x] Fix missing `cursor-pointer` on library delete buttons and servings controls
- [x] No horizontal overflow issues found
- [ ] Manual breakpoint testing at 375px/390px/768px/1024px/1440px — requires browser

### 6.4 — Accessibility Audit ✅
- [x] Color contrast: upgraded warm-400 → warm-500 for readable text (helper text, taglines)
- [x] Focus rings: visible on all interactive elements (shadcn defaults + ring-primary)
- [x] `aria-label` on all icon-only buttons (verified — no gaps found)
- [ ] Screen reader testing for recipe card flow — requires screen reader

**Files touched:** `button.tsx`, `globals.css`, `recipe-card.tsx`, `recipe-input.tsx`, `user-nav.tsx`, `cookbook-upload.tsx`, `library/page.tsx`, `home-page.tsx`, `(auth)/layout.tsx`, `profile/page.tsx`

---

## Priority Order

| Priority | Phase | Impact | Effort | Status |
|----------|-------|--------|--------|--------|
| 1 | Phase 1 — Design Foundation | HIGH | Medium | ✅ Done |
| 2 | Phase 2 — Hero & Landing | HIGH | Medium | ✅ Done |
| 3 | Phase 3 — Recipe Card | HIGH | Medium | ✅ Done |
| 4 | Phase 6 — Global Polish | MEDIUM | Low | ✅ Done |
| 5 | Phase 4 — Library Page | MEDIUM | Medium | ✅ Done |
| 6 | Phase 5 — Auth Pages | LOW | Low | ✅ Done |

---

## Design Tokens Reference

### Colors (implemented in `globals.css`)
```
--primary:          #7C9070 (sage green — buttons, links, accents)
--primary-foreground: #FFFFFF
--background:       #FAF8F5 (warm cream)
--foreground:       #292524 (warm dark)
--secondary:        #F4F7F2 (light sage)
--muted:            #F5F0EB (warm muted bg)
--muted-foreground: #78716C (warm gray text)
--border:           #E7E5E4 (warm border)
--destructive:      #DC2626 (red-600)
--ring:             #7C9070 (focus rings)
```

### Tailwind Scales
```
sage-50..sage-900:  #f4f7f2 → #2f382b (brand green scale)
warm-50..warm-900:  #faf8f5 → #1c1917 (warm neutral scale)
```

### Typography (implemented in `layout.tsx`)
```
--font-heading:  Lora (serif) — recipe titles, page headings, brand logo
--font-body:     DM Sans (sans-serif) — body text, labels, UI elements
--font-mono:     Geist Mono — code/technical contexts
```

### Spacing & Radii
```
Border Radius:    12px (cards), 8px (inputs), 9999px (pills/buttons)
Shadow sm:        0 1px 2px rgba(0,0,0,0.05)
Shadow md:        0 4px 6px rgba(0,0,0,0.07)
Shadow lg:        0 10px 15px rgba(0,0,0,0.1)
```
