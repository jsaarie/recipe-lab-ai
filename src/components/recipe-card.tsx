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

function MetaPill({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#7C9070]/10 px-2.5 py-1 text-xs text-[#5A6B50] sm:gap-1.5 sm:px-3 sm:text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-neutral-500">{formatDuration(value)}</span>
    </span>
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
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#7C9070]/10 px-2.5 py-1 text-xs text-[#5A6B50] sm:gap-1.5 sm:px-3 sm:text-sm"
      title={servingsLabel && servingsLabel !== String(originalServings) ? servingsLabel : undefined}
    >
      <span className="font-medium">Servings</span>
      <span className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(Math.max(1, servings - 1))}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[#5A6B50] hover:bg-[#7C9070]/20 transition-colors"
          aria-label="Decrease servings"
        >
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(servings)); setEditing(false); } }}
            className="w-8 bg-transparent text-center text-xs outline-none"
          />
        ) : (
          <button
            onClick={() => { setDraft(String(servings)); setEditing(true); }}
            className={`min-w-[1.5rem] text-center transition-colors ${isModified ? "font-semibold text-[#7C9070]" : "text-neutral-500"}`}
          >
            {servings}
          </button>
        )}
        <button
          onClick={() => onChange(servings + 1)}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[#5A6B50] hover:bg-[#7C9070]/20 transition-colors"
          aria-label="Increase servings"
        >
          +
        </button>
      </span>
    </span>
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
      className="inline-flex items-center gap-1 rounded-full border border-[#7C9070]/30 bg-[#7C9070]/5 px-2.5 py-1 text-xs font-medium text-[#5A6B50] transition-colors hover:bg-[#7C9070]/15 sm:px-3 sm:text-sm"
      title="Toggle unit system"
    >
      {value === "us" ? "US" : "Metric"}
      <svg className="h-3 w-3 opacity-60" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 8l3-3 3 3M4 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
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
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");

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
        setError("Sign in to save recipes");
        setSaving(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to save");
        setSaving(false);
        return;
      }

      const data = await res.json();
      setSaved(true);
      if (data.updated) {
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
          saved
            ? "bg-[#7C9070]/20 text-[#5A6B50]"
            : "border border-[#7C9070]/30 bg-[#7C9070]/5 text-[#5A6B50] hover:bg-[#7C9070]/15"
        }`}
      >
        {saving ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : saved ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.67 14H3.33A1.33 1.33 0 012 12.67V3.33A1.33 1.33 0 013.33 2h7.34L14 5.33v7.34A1.33 1.33 0 0112.67 14z" />
            <path d="M11.33 14V9.33H4.67V14" />
            <path d="M4.67 2v4h5.33" />
          </svg>
        )}
        {saving ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
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

  return (
    <div className="w-full max-w-2xl space-y-5 sm:space-y-8">
      {/* Title */}
      <div className="space-y-2 text-center sm:space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-800 sm:text-3xl">
          {recipe.title}
        </h2>
        <div className="flex items-center justify-center gap-3">
          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#7C9070] underline underline-offset-2 hover:text-[#6B7F60]"
          >
            View original recipe
          </a>
          <SaveRecipeButton recipe={recipe} editor={editor} />
          {source === "ai" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                <path d="M8 10a2.5 2.5 0 0 0 0 5" />
                <path d="M16 10a2.5 2.5 0 0 1 0 5" />
              </svg>
              AI extracted
            </span>
          )}
        </div>
      </div>

      {afterTitle}

      {/* Meta Pills row */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        <MetaPill label="Prep" value={recipe.prepTime} />
        <MetaPill label="Cook" value={recipe.cookTime} />
        <MetaPill label="Total" value={recipe.totalTime} />
        <ServingScaler
          servings={servings}
          originalServings={originalServings}
          servingsLabel={recipe.servings}
          onChange={onServingsChange}
        />
      </div>

      <hr className="border-neutral-200" />

      {/* Ingredients section header with unit toggle + reset */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-700">Ingredients</h3>
          <div className="flex items-center gap-2">
            <UnitToggle value={unitSystem} onChange={onUnitSystemChange} />
            {isModified && (
              <button
                onClick={() => {
                  if (confirmReset) { onResetAll(); setConfirmReset(false); }
                  else setConfirmReset(true);
                }}
                onBlur={() => setConfirmReset(false)}
                className="text-xs text-neutral-400 underline underline-offset-2 transition-colors hover:text-neutral-600"
              >
                {confirmReset ? "Confirm?" : "Reset"}
              </button>
            )}
          </div>
        </div>
        <div className="space-y-0">
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

      <hr className="border-neutral-200" />

      {/* Instructions */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg font-semibold text-neutral-700">Instructions</h3>
        <ol className="space-y-3 sm:space-y-4">
          {derivedInstructions.map((step, i) => (
            <li key={i} className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7C9070]/10 text-xs font-semibold text-[#5A6B50] sm:h-7 sm:w-7 sm:text-sm">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-neutral-700 sm:text-base">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <>
          <hr className="border-neutral-200" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-700">Notes</h3>
            <p className="text-base leading-relaxed text-neutral-600">
              {recipe.notes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
