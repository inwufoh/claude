# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests with Vitest
npm run setup        # npm install + prisma generate + prisma migrate dev
npm run db:reset     # Reset database (destructive)
```

To run a single test file:
```bash
npx vitest run src/lib/__tests__/your-test-file.test.ts
```

## Environment

- `ANTHROPIC_API_KEY` — Optional. If unset, a `MockLanguageModel` returns static component templates (Counter, ContactForm, Card). The app is fully functional without it.
- `JWT_SECRET` — Optional. Defaults to `"development-secret-key"` in development.

## Architecture

**UIGen** is an AI-powered React component generator. Users chat with Claude, which generates components that appear in a live preview.

### Data Flow

```
Chat input → POST /api/chat (streaming, Vercel AI SDK)
           → Claude (claude-haiku-4-5) with tool calls
           → VirtualFileSystem (in-memory)
           → Serialized as JSON → Prisma (SQLite) for authenticated users
           → PreviewFrame (Babel transpiles JSX in-browser iframe)
```

### Key Directories

- `src/app/` — Next.js App Router pages. `main-content.tsx` is the main UI shell (resizable panels: chat / editor / preview).
- `src/app/api/chat/` — Single streaming API route. Calls `streamText()` with `str_replace_editor` and `file_manager` tools; saves project on completion if user is authenticated.
- `src/lib/` — Core logic:
  - `file-system.ts` — `VirtualFileSystem` class; all generated files live in memory only, serialized as JSON into Prisma's `Project.data` column.
  - `provider.ts` — `getLanguageModel()` returns real Claude or mock depending on `ANTHROPIC_API_KEY`.
  - `auth.ts` — HS256 JWT sessions stored in an httpOnly cookie (`auth-token`, 7-day expiry).
  - `tools/` — AI tool definitions: `str-replace.ts` (file edit) and `file-manager.ts` (create/delete).
  - `prompts/` — System prompts fed to Claude.
  - `transform/` — JSX transformer for in-browser preview rendering.
- `src/actions/` — Next.js server actions for auth (`signUp`, `signIn`, `signOut`) and project CRUD.
- `src/components/` — UI split into `chat/`, `editor/`, `preview/`, `auth/`, and `ui/` (shadcn primitives).
- `src/lib/contexts/` — `FileSystemContext` and `ChatContext` wire state across the component tree.

### Auth

Anonymous users can generate components; their work is ephemeral. Authenticated users get project persistence. The middleware (`src/middleware.ts`) guards `/api/projects` and `/api/filesystem` routes.

### Database

SQLite via Prisma. Two models: `User` and `Project`. `Project.messages` and `Project.data` store JSON strings (chat history and serialized `VirtualFileSystem` respectively).

Reference `prisma/schema.prisma` whenever you need to understand the structure of data stored in the database.

### Component Preview

`PreviewFrame` renders generated components in a sandboxed iframe using `@babel/standalone` to transpile JSX at runtime. No disk writes occur — files exist only in the `VirtualFileSystem` instance held in `FileSystemContext`.

### Code Style

Use comments sparingly — only on complex or non-obvious logic.

### Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma + SQLite · Vercel AI SDK · Monaco Editor · Vitest
