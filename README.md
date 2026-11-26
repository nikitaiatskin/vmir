# Hanger — Digital Wardrobe 👗

An iPhone app that keeps your whole wardrobe in your pocket, so every new purchase is a deliberate one.

## Features (MVP)
- **Digital wardrobe**: photograph clothes, on-device background removal, colour detection and Apple Intelligence auto-tagging, filters by category, colour and season.
- **Outfit builder**: drag, pinch and rotate your items on a canvas, save and tag outfits.
- **Wishlist + match check**: add from a photo, a shop screenshot or a link; see what you already own that is similar, and what a new item goes with.
- **Cool-off timer**: wait 7 / 14 / 30 days, get a reminder, then decide: Bought (goes to the wardrobe) or Skipped (money saved).
- **Cost per wear + stats**: one-tap "Worn today", cost per wear, most / never worn, wear calendar.

## Docs
| File | What's inside |
|---|---|
| [`project.md`](project.md) | Problem, users, MVP, non-goals, tech stack, epics and user stories |
| [`SPEC.md`](SPEC.md) | Architecture, data model, screens, business rules, testing |
| [`DESIGN.md`](DESIGN.md) | Colours, typography, components, screen layouts |
| [`CLAUDE.md`](CLAUDE.md) | Engineering rules and workflow for contributors and Claude Code |

## Tech stack
Expo SDK 58 development build (React Native 0.88, TypeScript) · Swift Expo Module `hanger-vision` (Vision + Apple Intelligence Foundation Models) · expo-router native tabs · Supabase (Postgres + RLS, anonymous auth, Storage) · TanStack Query · Reanimated + Gesture Handler v3 · Jest + Testing Library · GitHub Actions · EAS

## Project structure
```
app/                     screens (expo-router)
src/api/                 Supabase queries and mutations (TanStack Query hooks)
src/features/            pure business logic: colour, match check, cool-off, cost per wear …
src/components/          UI components (theme tokens only)
src/lib/                 Supabase client, auth, images, notifications, settings
modules/hanger-vision/   Swift module: Vision + Foundation Models
supabase/migrations/     database schema and RLS
supabase/tests/          pgTAP tests for RLS
__tests__/               Jest unit and component tests
```

## Getting started

**Requirements:** a Mac with Xcode 26+, an iPhone on iOS 17+ (Apple Intelligence features: iPhone 15 Pro or newer on iOS 26+), Node 22.

### 1. Backend (Supabase)
Either use a free cloud project or run it locally:

- **Cloud:** create a project at supabase.com → *Authentication → Sign In / Providers* → enable **Anonymous sign-ins**. Then link and push the schema:
  ```bash
  npx supabase link --project-ref <your-project-ref>
  npx supabase db push
  ```
- **Local (Docker):** `npx supabase start` — migrations are applied automatically.

### 2. App
```bash
git clone https://github.com/nikitaiatskin/vmir.git hanger && cd hanger
npm install
cp .env.example .env               # fill in the Supabase URL and anon key
npx expo run:ios --device          # builds the development build onto your iPhone
```
After the first build, start the dev server with `npm start` and open the Hanger app on the phone.

> Expo Go is **not** supported: the app contains its own Swift module. Rebuild (`npx expo run:ios --device`) after changing anything in `modules/` or `app.json`.

### 3. Checks
```bash
npm run lint
npm run typecheck
npm test
npx supabase test db               # RLS tests (needs local Supabase)
```

## CI/CD
GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, Jest and the RLS tests on every push and PR. On `main` it can also apply migrations and publish an EAS Update when these repository secrets are set: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Status
✅ Steps 1–11 of the release plan are implemented on branch `mvp`.

Verified without a Mac: ESLint, TypeScript, 75 Jest tests, the iOS JavaScript bundle (`expo export`), iOS prebuild with the Swift module autolinked, and the migration + RLS tests on Postgres.

**Not verified yet — needs a Mac and an iPhone:**
- compiling the Swift module in Xcode and running Vision / Apple Intelligence on a device;
- the manual checklist: camera, cutout, auto-tag and its fallback, reminders, canvas gestures.

**Known limits of the MVP:** link sharing works by "Paste link" or `hanger://add-wish?url=…` (a Share Extension comes later); auto-tagging sends Vision labels and colour names to the on-device model rather than the image itself.
