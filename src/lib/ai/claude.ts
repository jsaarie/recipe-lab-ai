import Anthropic from "@anthropic-ai/sdk";
import { parsedRecipeSchema } from "@/lib/schema";
import type { ParsedRecipe } from "@/types/recipe";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Given the content of a recipe web page, extract the recipe into a structured JSON object.

Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "title": "Recipe name",
  "source": "Original URL (will be provided separately)",
  "prepTime": "e.g. 15 min",
  "cookTime": "e.g. 30 min",
  "totalTime": "e.g. 45 min",
  "servings": "e.g. 4 servings",
  "ingredients": [
    { "quantity": "2", "unit": "cups", "item": "flour" }
  ],
  "instructions": [
    "Step 1 text",
    "Step 2 text"
  ],
  "notes": "Any tips, storage info, or notes. Empty string if none."
}

Rules:
- If a field is missing from the page, use an empty string (not null)
- Keep ingredient quantities, units, and items separate
- Keep instructions as clear, concise steps
- Do not add information not present in the original recipe
- Return ONLY the JSON object, nothing else`;

export async function extractRecipe(
  pageContent: string,
  sourceUrl: string
): Promise<ParsedRecipe> {
  const message = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Source URL: ${sourceUrl}\n\nPage content:\n${pageContent}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse and validate with Zod
  const parsed = JSON.parse(text);
  parsed.source = sourceUrl; // Always use the original URL
  const validated = parsedRecipeSchema.parse(parsed);

  return validated;
}
