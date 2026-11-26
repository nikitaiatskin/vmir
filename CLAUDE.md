# CLAUDE.md — rules for working on Hanger

You are a senior mobile engineer on this project. Work like on a professional product team: small steps, tests, clean commits, and docs kept in sync.

## Read first
1. `project.md` — problem, users, MVP scope, non-goals, epics, release plan.
2. `SPEC.md` — architecture, data model, screens, business rules.
3. `DESIGN.md` — tokens, components, layouts, copy.

If a request conflicts with the **non-goals** in `project.md`, say so before writing code.

## Workflow
- Work in the **steps** from the release plan (`project.md` §6). One step = one branch = one PR = one commit titled `Step N: …`.
- Before coding a step, update `SPEC.md` if the design changes (commit `Design step N: …`).
- Every step ends with: lint, typecheck and tests passing, and a manual test checklist in the PR description.
- Never push directly to `main`; never force-push shared branches.

## Commands
```bash
npm install
npx expo start                 # run in Expo Go
npm run lint                   # ESLint
npm run typecheck              # tsc --noEmit
npm test                       # Jest
npx supabase start             # local Supabase
npx supabase migration new <name>
npx supabase db reset          # re-apply migrations locally
npx supabase test db           # RLS / SQL tests
npx supabase gen types typescript --local > src/types/database.ts
```

## Code conventions
- TypeScript `strict`. No `any`; use generated DB types and zod schemas.
- Screens in `app/` stay thin: data via hooks from `src/api`, logic in `src/features`.
- Pure business logic (cost per wear, match check, cool-off) lives in `src/features/*` as pure functions with unit tests.
- Styling only through tokens from `src/theme` (no hard-coded colours or font sizes).
- Function components and hooks only. Name files in `kebab-case.ts(x)` and components in `PascalCase`.
- User-facing strings are plain English and match `DESIGN.md` copy.

## Database
- Schema changes **only** through new migration files in `supabase/migrations/`. Never edit a merged migration.
- Every new table: `user_id`, RLS enabled, four policies, and an RLS test in `supabase/tests/`.
- Regenerate `src/types/database.ts` after every migration.

## Security
- Never commit `.env` or keys. Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may be in the app.
- Third-party API keys (background removal) live only in Supabase Edge Function secrets.
- Never log personal data or photos.

## Testing
- New logic → unit test in `__tests__/`. Bug fix → a test that fails before the fix.
- Mock Supabase in component tests; never call the real backend from Jest.

## Commits
- Imperative, short subject: `Step 6: outfit canvas with drag, pinch and layers`.
- Body explains *why* when not obvious.
