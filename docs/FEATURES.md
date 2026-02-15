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
