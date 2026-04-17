# DANABRI Panel

Admin panel built with Next.js App Router, MySQL and Tailwind.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Short Architecture Guide

Request flow:

1. UI pages/components in `src/app/(panel)` and `src/components`
2. Frontend fetch wrappers in `src/services`
3. API route handlers in `src/app/api`
4. Backend/business + SQL access in `src/modules`
5. DB connection in `src/lib/db.js`

Architecture rule:

- `src/app/api/**` must call `src/modules/**` directly.
- `src/app/api/**` must NOT import `src/services/**`.

This avoids API recursion and keeps frontend and backend responsibilities separate.

## Naming Convention (English, Canonical)

Canonical files should use English names.

Examples already migrated:

- `src/modules/clients.service.js` (canonical)
- `src/modules/suppliers.service.js` (canonical)
- `src/services/suppliersService.js` (canonical)
- `src/services/clientsApiService.js` (canonical)

Legacy Spanish filenames are kept as compatibility wrappers to avoid breaking existing imports.

## Layer Guardrails (Point 3)

ESLint now enforces architecture boundaries for API routes.

- Config: `eslint.config.mjs`
- Rule: `no-restricted-imports` on `src/app/api/**/*`
- Restriction: importing from `@/services/*` inside API route files

## Domain Naming Unification (Point 4)

Current direction:

- Keep external routes stable for now (no URL breakage).
- Standardize internal file naming in English.
- Migrate imports gradually to canonical English files.
- Keep backward-compatible wrappers until all imports are migrated.

## JavaScript-First Strategy (Point 5)

This codebase is currently JS-first by decision.

- Primary app code is `.js` / `.jsx`.
- TypeScript is available for incremental adoption where needed.
- New features can remain in JS unless there is a clear TS requirement.

## PR Checklist

Before opening a PR, verify:

1. API routes import from `src/modules` only.
2. New files follow canonical English naming.
3. No route/path regressions in panel navigation.
4. `pnpm lint` passes.
5. Affected modules were smoke-tested in UI and API.
