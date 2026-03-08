# Recipe Lab AI — Claude Code Guide

## Project Overview

Recipe Lab AI is a web app that takes a recipe URL and parses it into a clean, structured, easy-to-read format. It acts as a personal sous-chef, stripping away ads, narratives, and clutter from recipe websites.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI**: Gemini 2.5 Flash
- **Auth**: NextAuth.js v5 beta (Credentials provider, JWT sessions, TOTP MFA)
- **Database**: MongoDB Atlas (native driver; v2.2+)
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Key Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript compiler check
```

## Project Structure

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (ui/ for shadcn, feature components at root)
- `src/lib/ai/` — Gemini integration and recipe extraction logic
- `src/lib/` — Utilities, scraper, validators
- `src/types/` — TypeScript type definitions
- `docs/` — Product docs (PRD, features, architecture)

## Conventions

- Use `pnpm` for all package operations
- Use the App Router (`src/app/`), not Pages Router
- Components use named exports
- Gemini integration in `src/lib/ai/gemini.ts`
- Validate AI responses with Zod schemas
- Mobile-first responsive design

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
GEMINI_API_KEY=           # Required — Google Gemini API key
MONGODB_URI=              # Required (v2.2+) — MongoDB Atlas connection string
AUTH_SECRET=              # Required (v2.2+) — random secret for JWT signing
BROWSERLESS_API_KEY=      # Optional — enables Cloudflare bypass via Browserless.io
```

## Documentation

- [docs/PRD.md](docs/PRD.md) — Product requirements and roadmap
- [docs/FEATURES.md](docs/FEATURES.md) — MVP feature specification
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical architecture and data flow
