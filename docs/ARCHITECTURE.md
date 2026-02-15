# Recipe Lab AI — Technical Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI Providers | Claude API (Anthropic SDK) + OpenAI API |
| Database | MongoDB (post-MVP, not used in v0.1) |
| Auth | NextAuth.js or Clerk (post-MVP) |
| Deployment | Vercel |
| Package Manager | pnpm |

## Project Structure

```
recipe-lab-ai/
├── docs/                          # Project documentation
│   ├── PRD.md                     # Product requirements
│   ├── FEATURES.md                # Feature specifications
│   └── ARCHITECTURE.md            # This file
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Homepage (URL input + recipe display)
│   │   ├── globals.css            # Global styles + Tailwind
│   │   └── api/
│   │       └── parse-recipe/
│   │           └── route.ts       # POST endpoint for recipe parsing
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── recipe-input.tsx       # URL input form component
│   │   ├── recipe-card.tsx        # Parsed recipe display card
│   │   ├── recipe-skeleton.tsx    # Loading skeleton for recipe card
│   │   └── header.tsx             # App header/nav
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider.ts        # AI provider interface & factory
│   │   │   ├── claude.ts          # Claude API implementation
│   │   │   ├── openai.ts          # OpenAI API implementation
│   │   │   └── prompt.ts          # Shared prompt template for recipe extraction
│   │   ├── scraper.ts             # URL fetching and HTML content extraction
│   │   ├── validators.ts          # Zod schemas for recipe data validation
│   │   └── utils.ts               # Shared utility functions
│   └── types/
│       └── recipe.ts              # TypeScript types/interfaces
├── public/
│   └── ...                        # Static assets
├── CLAUDE.md                      # Claude Code project guide
├── .env.example                   # Environment variable template
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Data Flow

```
User pastes URL
       │
       ▼
[Client] POST /api/parse-recipe { url }
       │
       ▼
[API Route] Validate URL
       │
       ▼
[Scraper] Fetch URL → Extract text content from HTML
       │
       ▼
[AI Provider] Send content + prompt → Receive structured JSON
       │
       ▼
[Validator] Validate AI response against Zod schema
       │
       ▼
[API Route] Return ParsedRecipe JSON to client
       │
       ▼
[Client] Render recipe in RecipeCard component
```

## Key Design Decisions

### 1. AI Provider Abstraction

A common `AIProvider` interface allows swapping between Claude and OpenAI (or adding new providers) without changing business logic. The active provider is selected via the `AI_PROVIDER` env var.

### 2. Server-Side URL Fetching

Recipe URLs are fetched server-side in the API route to avoid CORS issues and to keep scraping logic away from the client.

### 3. Zod Validation

AI responses are validated with Zod schemas to ensure structured, predictable data even when AI output varies. Malformed responses fall back gracefully.

### 4. Stateless MVP

No database, no auth, no sessions. The app is purely request/response for MVP. This keeps infrastructure simple and costs near-zero (only AI API usage).

### 5. Content Extraction Before AI

Raw HTML is cleaned and reduced to meaningful text before sending to the AI. This reduces token usage and improves parsing accuracy.

## Environment Variables

```bash
# AI Provider Selection
AI_PROVIDER=claude              # "claude" or "openai"

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Future Architecture Additions

| Phase | Addition |
|-------|----------|
| v0.2 | MongoDB connection via Mongoose, NextAuth/Clerk integration |
| v0.3 | WebSocket or SSE for streaming AI cooking guidance |
| v0.5 | Timer service (client-side, Web Workers) |
| v0.6 | Background jobs for meal plan generation |
