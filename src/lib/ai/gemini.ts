import { GoogleGenAI } from "@google/genai";
import { z } from "zod/v4";
import { parsedRecipeSchema } from "@/lib/schema";
import type { ParsedRecipe, StepIngredient } from "@/types/recipe";

const ai = new GoogleGenAI({});

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Given the content of a recipe web page, extract the recipe into a structured JSON object.

Rules:
- If a field is missing from the page, use an empty string (not null)
- Keep ingredient quantities, units, and items separate
- Keep instructions as clear, concise steps
- Do not add information not present in the original recipe

For stepIngredients:
- Map each ingredient to the step(s) where it is used
- stepIngredients must be an array with the same length as instructions
- Each entry is an array of ingredients used in that step
- If a step uses no ingredients (e.g. "Preheat oven"), use an empty array []
- If an ingredient is used across multiple steps, split the quantity proportionally
- When splitting, include totalQuantity and totalUnit to show the full recipe amount
- When an ingredient is used entirely in one step, omit totalQuantity and totalUnit`;

export async function extractRecipe(
  pageContent: string,
  sourceUrl: string
): Promise<ParsedRecipe> {
  const responseSchema = z.toJSONSchema(parsedRecipeSchema);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Source URL: ${sourceUrl}\n\nPage content:\n${pageContent}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text);
  parsed.source = sourceUrl;

  const validated = parsedRecipeSchema.parse(parsed);

  // Validate stepIngredients length matches instructions
  if (
    validated.stepIngredients &&
    validated.stepIngredients.length !== validated.instructions.length
  ) {
    // Length mismatch — discard stepIngredients rather than crash
    validated.stepIngredients = undefined;
  }

  return validated;
}

const STEP_MAP_PROMPT = `You are a recipe assistant. Given a numbered list of ingredients and instruction steps, return the 1-based indices of the ingredients used in each step.

Rules:
- stepIngredients must have the SAME length as the instructions array
- Each entry is an array of 1-based ingredient indices used in that step
- If a step uses no ingredients, use an empty array []
- An ingredient index may appear in multiple steps`;

// Index-only schema: AI returns [[1,3],[2,4],[]] instead of echoing full ingredient objects.
// Server reconstructs StepIngredient[] from indices — ~10x fewer output tokens.
const stepMapSchema = z.object({
  stepIngredients: z.array(z.array(z.number().int().min(1))),
});

function formatIngredientString(ing: { quantity: string; unit: string; item: string }): string {
  return [ing.quantity, ing.unit, ing.item].filter(Boolean).join(" ");
}

export async function mapStepIngredients(
  recipe: Pick<ParsedRecipe, "ingredients" | "instructions">
): Promise<StepIngredient[][] | undefined> {
  const ingredientLines = recipe.ingredients.map((ing, i) => `${i + 1}. ${formatIngredientString(ing)}`).join("\n");
  const instructionLines = recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const input = `Ingredients:\n${ingredientLines}\n\nInstructions:\n${instructionLines}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: input,
    config: {
      systemInstruction: STEP_MAP_PROMPT,
      responseMimeType: "application/json",
      responseSchema: z.toJSONSchema(stepMapSchema),
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text ?? "";
  const parsed = stepMapSchema.parse(JSON.parse(text));

  if (parsed.stepIngredients.length !== recipe.instructions.length) {
    return undefined;
  }

  // Reconstruct full StepIngredient objects from indices
  return parsed.stepIngredients.map((indices) =>
    indices
      .map((i) => recipe.ingredients[i - 1])
      .filter((ing): ing is StepIngredient => ing != null)
  );
}
