"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import type { ParsedRecipe, Ingredient } from "@/types/recipe";
import type { UnitSystem, IngredientOverride } from "@/lib/use-recipe-editor";

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

function formatDuration(value: string): string {
  const minMatch = value.match(/^(\d+)\s*(?:min(?:utes?)?|m)$/i);
  if (minMatch) {
    const total = parseInt(minMatch[1]);
    if (total >= 60) {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${total}m`;
  }
  const hrMinMatch = value.match(/^(\d+)\s*(?:hr|hour)s?\s*(?:(\d+)\s*(?:min(?:utes?)?|m))?$/i);
  if (hrMinMatch) {
    const h = parseInt(hrMinMatch[1]);
    const m = hrMinMatch[2] ? parseInt(hrMinMatch[2]) : 0;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Meta pill
// ---------------------------------------------------------------------------

function MetaPill({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-warm-200/60">
      {icon && <span className="text-primary/70">{icon}</span>}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-warm-400 sm:text-[11px]">{label}</span>
        <span className="text-sm font-semibold text-warm-700 sm:text-base">{formatDuration(value)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Serving scaler
// ---------------------------------------------------------------------------

function ServingScaler({
  servings,
  originalServings,
  servingsLabel,
  onChange,
}: {
  servings: number;
  originalServings: number;
  servingsLabel?: string;
  onChange: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(servings));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const n = parseInt(draft);
    if (!isNaN(n) && n > 0) onChange(n);
    else setDraft(String(servings));
    setEditing(false);
  };

  const isModified = servings !== originalServings;

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 shadow-sm ring-1 ring-primary/20"
      title={servingsLabel && servingsLabel !== String(originalServings) ? servingsLabel : undefined}
    >
      <svg className="h-4 w-4 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v-2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-warm-400 sm:text-[11px]">Servings</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(Math.max(1, servings - 1))}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-warm-500 transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Decrease servings"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(servings)); setEditing(false); } }}
              className="w-8 bg-transparent text-center text-sm font-semibold text-warm-700 outline-none"
            />
          ) : (
            <button
              onClick={() => { setDraft(String(servings)); setEditing(true); }}
              className={`min-w-[1.5rem] cursor-pointer text-center text-sm font-semibold transition-colors sm:text-base ${isModified ? "text-primary" : "text-warm-700"}`}
            >
              {servings}
            </button>
          )}
          <button
            onClick={() => onChange(servings + 1)}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-warm-500 transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Increase servings"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit system toggle
// ---------------------------------------------------------------------------

function UnitToggle({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (s: UnitSystem) => void;
}) {
  return (
    <button
      onClick={() => onChange(value === "us" ? "metric" : "us")}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs font-medium text-warm-600 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary sm:text-sm"
      title="Toggle unit system"
    >
      {value === "us" ? "US" : "Metric"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Checkable ingredient row (with inline quantity editing + swap)
// ---------------------------------------------------------------------------

function IngredientRow({
  ingredient,
  index,
  override,
  onQuantityChange,
  onItemChange,
  onClearSwap,
}: {
  ingredient: Ingredient;
  index: number;
  override?: IngredientOverride;
  onQuantityChange: (i: number, qty: string) => void;
  onItemChange: (i: number, item: string) => void;
  onClearSwap: (i: number) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(ingredient.quantity);
  const [swapping, setSwapping] = useState(false);
  const [swapDraft, setSwapDraft] = useState(ingredient.item);
  const qtyRef = useRef<HTMLInputElement>(null);
  const swapRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingQty) qtyRef.current?.focus();
  }, [editingQty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!editingQty) setQtyDraft(ingredient.quantity);
  }, [ingredient.quantity, editingQty]);

  useEffect(() => {
    if (swapping) swapRef.current?.focus();
  }, [swapping]);

  const commitQty = () => {
    const trimmed = qtyDraft.trim() || ingredient.quantity;
    if (trimmed !== ingredient.quantity) {
      onQuantityChange(index, trimmed);
    }
    setEditingQty(false);
  };

  const commitSwap = () => {
    const trimmed = swapDraft.trim();
    if (trimmed && trimmed !== ingredient.item) {
      onItemChange(index, trimmed);
    } else {
      setSwapDraft(ingredient.item);
    }
    setSwapping(false);
  };

  const wasSwapped = override?.wasSwapped;

  return (
    <div className={`group flex items-start gap-2 py-1.5 ${checked ? "opacity-60" : ""}`}>
      {/* Checkbox */}
      <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => setChecked(!checked)}
          className="h-4 w-4 rounded border-neutral-300 text-[#7C9070] accent-[#7C9070]"
        />
      </label>

      {/* Ingredient content */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5">
        {/* Quantity — tap to edit */}
        {ingredient.quantity && (
          editingQty ? (
            <input
              ref={qtyRef}
              value={qtyDraft}
              onChange={(e) => setQtyDraft(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitQty();
                if (e.key === "Escape") { setQtyDraft(ingredient.quantity); setEditingQty(false); }
              }}
              className="w-14 rounded border border-[#7C9070]/40 bg-[#7C9070]/5 px-1 text-sm text-neutral-700 outline-none focus:border-[#7C9070]"
            />
          ) : (
            <button
              onClick={() => { setQtyDraft(ingredient.quantity); setEditingQty(true); }}
              className={`rounded px-0.5 text-base transition-colors hover:bg-[#7C9070]/10 ${checked ? "line-through text-neutral-400" : "text-neutral-700"} ${override?.quantity ? "font-medium text-[#7C9070]" : ""}`}
              title="Tap to edit quantity"
            >
              {ingredient.quantity}
            </button>
          )
        )}

        {/* Unit */}
        {ingredient.unit && (
          <span className={`text-base ${checked ? "line-through text-neutral-400" : "text-neutral-700"}`}>
            {ingredient.unit}
          </span>
        )}

        {/* Item — tap swap icon to open edit */}
        {swapping ? (
          <input
            ref={swapRef}
            value={swapDraft}
            onChange={(e) => setSwapDraft(e.target.value)}
            onBlur={commitSwap}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSwap();
              if (e.key === "Escape") { setSwapDraft(ingredient.item); setSwapping(false); }
            }}
            className="flex-1 rounded border border-[#7C9070]/40 bg-[#7C9070]/5 px-1 text-sm text-neutral-700 outline-none focus:border-[#7C9070]"
          />
        ) : (
          <span className={`text-base ${checked ? "line-through text-neutral-400" : wasSwapped ? "text-[#7C9070] font-medium" : "text-neutral-700"}`}>
            {ingredient.item}
            {wasSwapped && (
              <span className="ml-1 text-xs text-[#7C9070] opacity-70">(swapped)</span>
            )}
          </span>
        )}
      </div>

      {/* Action buttons — always visible on mobile, hover on desktop */}
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        {/* Swap button */}
        {!swapping && (
          <button
            onClick={() => { setSwapDraft(ingredient.item); setSwapping(true); }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#7C9070]"
            title="Swap ingredient"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5h10M9 2l3 3-3 3" />
              <path d="M14 11H4M7 8l-3 3 3 3" />
            </svg>
          </button>
        )}
        {/* Clear swap button */}
        {wasSwapped && (
          <button
            onClick={() => { onClearSwap(index); setSwapDraft(/* will reset on re-render */ ""); }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-500"
            title="Reset to original ingredient"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L4 12M4 4l8 8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecipeCard — main export
// ---------------------------------------------------------------------------

export interface RecipeCardEditorProps {
  derivedIngredients: Ingredient[];
  derivedInstructions: string[];
  servings: number;
  originalServings: number;
  unitSystem: UnitSystem;
  ingredientOverrides: Map<number, IngredientOverride>;
  onServingsChange: (n: number) => void;
  onIngredientQuantityChange: (i: number, qty: string) => void;
  onIngredientItemChange: (i: number, item: string) => void;
  onClearIngredientSwap: (i: number) => void;
  onUnitSystemChange: (s: UnitSystem) => void;
  onResetAll: () => void;
}

// ---------------------------------------------------------------------------
// Save recipe button
// ---------------------------------------------------------------------------

function SaveRecipeButton({
  recipe,
  editor,
}: {
  recipe: ParsedRecipe;
  editor: RecipeCardEditorProps;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<"saved" | "removed" | null>(null);
  const [pop, setPop] = useState(false);
  const [error, setError] = useState("");

  const handleToggle = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setToast(null);

    if (saved) {
      // Unsave — optimistic UI
      setSaved(false);
      setPop(false);
      setToast("removed");
      setSaving(false);
      setTimeout(() => setToast(null), 1500);
      return;
    }

    const ingredientSwaps: Record<number, string> = {};
    editor.ingredientOverrides.forEach((override, index) => {
      if (override.wasSwapped && override.item) {
        ingredientSwaps[index] = override.item;
      }
    });

    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe,
          servings: editor.servings,
          ingredientSwaps,
          unitSystem: editor.unitSystem,
        }),
      });

      if (res.status === 401) {
        setError("Sign in to save");
        setSaving(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to save");
        setSaving(false);
        return;
      }

      await res.json();
      setSaved(true);
      setPop(true);
      setToast("saved");
      setTimeout(() => setPop(false), 300);
      setTimeout(() => setToast(null), 1500);
    } catch {
      setError("Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="inline-flex items-center">
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`cursor-pointer transition-all duration-200 disabled:cursor-not-allowed ${
          saved ? "text-primary" : "text-warm-300 hover:text-primary"
        } disabled:opacity-60`}
        aria-label={saving ? "Saving recipe" : saved ? "Unsave recipe" : "Save recipe"}
      >
        {saving ? (
          <svg className="h-5 w-5 animate-spin sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 ${pop ? "scale-125" : "scale-100"}`}
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        )}
      </button>
      {/* Toast label */}
      <span
        className={`pointer-events-none ml-1 whitespace-nowrap text-xs font-medium transition-all duration-300 ${
          toast ? "opacity-100" : "opacity-0"
        } ${toast === "saved" ? "text-primary" : "text-warm-400"}`}
      >
        {toast === "saved" ? "Saved" : toast === "removed" ? "Removed" : ""}
      </span>
      {error && (
        <span className="ml-1 whitespace-nowrap text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}

export function RecipeCard({
  recipe,
  source,
  afterTitle,
  editor,
}: {
  recipe: ParsedRecipe;
  source?: "structured" | "ai";
  afterTitle?: ReactNode;
  editor: RecipeCardEditorProps;
}) {
  const {
    derivedIngredients,
    derivedInstructions,
    servings,
    originalServings,
    unitSystem,
    ingredientOverrides,
    onServingsChange,
    onIngredientQuantityChange,
    onIngredientItemChange,
    onClearIngredientSwap,
    onUnitSystemChange,
    onResetAll,
  } = editor;

  const [confirmReset, setConfirmReset] = useState(false);

  const isModified =
    servings !== originalServings ||
    ingredientOverrides.size > 0 ||
    unitSystem !== "us";

  // Icons for meta pills
  const stepsIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="M3 5l2 2 4-4" />
      <path d="M3 11l2 2 4-4" />
      <path d="M3 17l2 2 4-4" />
    </svg>
  );
  const prepIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3" />
      <path d="M18 15v7" />
    </svg>
  );
  const cookIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5c0-1 .5-2 .5-2s.5 1 .5 2-.5 2-.5 2S9 6 9 5z" />
      <path d="M12 3c0-1 .5-2 .5-2s.5 1 .5 2-.5 2-.5 2-.5-1-.5-2z" />
      <path d="M15 5c0-1 .5-2 .5-2s.5 1 .5 2-.5 2-.5 2-.5-1-.5-2z" />
      <path d="M4 10h16v2a8 8 0 01-8 8 8 8 0 01-8-8v-2z" />
      <path d="M4 10c-1 0-2 .5-2 2s1 2 2 2" />
      <path d="M20 10c1 0 2 .5 2 2s-1 2-2 2" />
    </svg>
  );
  const totalIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="9" />
      <polyline points="12 9 12 13 15.5 15" />
      <path d="M12 4V2" />
      <path d="M5 3L3 5" />
      <path d="M19 3l2 2" />
    </svg>
  );

  return (
    <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
      {/* ── Hero header card ── */}
      <div className="rounded-2xl border border-warm-200/80 bg-white p-5 shadow-sm sm:p-8">
        {/* Title + Save + Cook CTA */}
        <div className="space-y-3 sm:space-y-4">
          {source === "ai" && (
            <div className="text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-600">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                  <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                  <path d="M8 10a2.5 2.5 0 0 0 0 5" />
                  <path d="M16 10a2.5 2.5 0 0 1 0 5" />
                </svg>
                AI extracted
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-warm-800 sm:text-3xl md:text-4xl">
              {recipe.title}
            </h2>
            <SaveRecipeButton recipe={recipe} editor={editor} />
          </div>
        </div>

        {/* ── Meta grid ── */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-5 sm:gap-2.5">
          <MetaPill label="Steps" value={String(derivedInstructions.length)} icon={stepsIcon} />
          <MetaPill label="Prep" value={recipe.prepTime} icon={prepIcon} />
          <MetaPill label="Cook" value={recipe.cookTime} icon={cookIcon} />
          <MetaPill label="Total" value={recipe.totalTime} icon={totalIcon} />
          <div className="col-span-2 sm:col-span-1">
            <ServingScaler
              servings={servings}
              originalServings={originalServings}
              servingsLabel={recipe.servings}
              onChange={onServingsChange}
            />
          </div>
          {/* Cook CTA — integrated into meta grid */}
          <div className="col-span-2 sm:col-span-5">
            {afterTitle}
          </div>
        </div>
      </div>

      {/* ── Ingredients section ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z" />
              <path d="M6 9.01V9" />
            </svg>
          </div>
          <h3 className="flex-1 text-lg font-semibold text-warm-700">Ingredients</h3>
          <div className="flex items-center gap-2">
            <UnitToggle value={unitSystem} onChange={onUnitSystemChange} />
            {isModified && (
              <button
                onClick={() => {
                  if (confirmReset) { onResetAll(); setConfirmReset(false); }
                  else setConfirmReset(true);
                }}
                onBlur={() => setConfirmReset(false)}
                className="cursor-pointer rounded-lg border border-warm-200 bg-white px-2.5 py-1.5 text-xs text-warm-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                {confirmReset ? "Confirm?" : "Reset"}
              </button>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-warm-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="space-y-0.5">
            {derivedIngredients.map((ing, i) => (
              <IngredientRow
                key={i}
                index={i}
                ingredient={ing}
                override={ingredientOverrides.get(i)}
                onQuantityChange={onIngredientQuantityChange}
                onItemChange={onIngredientItemChange}
                onClearSwap={onClearIngredientSwap}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Instructions section ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-warm-700">Instructions</h3>
        </div>
        <div className="rounded-xl border border-warm-200/80 bg-white p-4 shadow-sm sm:p-5">
          <ol className="space-y-4 sm:space-y-5">
            {derivedInstructions.map((step, i) => (
              <li key={i} className="flex gap-3 sm:gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary sm:h-8 sm:w-8 sm:text-sm">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-warm-600 sm:text-base">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Notes + Source ── */}
      <div className="space-y-3">
        {recipe.notes && (
          <div className="rounded-xl border border-warm-200/80 bg-warm-50 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-warm-700">Notes</h3>
            </div>
            <p className="text-sm leading-relaxed text-warm-600 sm:text-base">
              {recipe.notes}
            </p>
          </div>
        )}
        <div className="flex justify-center">
          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-warm-400 transition-colors hover:text-primary"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View original recipe
          </a>
        </div>
      </div>
    </div>
  );
}
