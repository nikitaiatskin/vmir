# Hanger — Digital Wardrobe 👗

An iPhone app that keeps your whole wardrobe in your pocket, so every new purchase is a deliberate one.

## Features (MVP)
- **Digital wardrobe**: photograph clothes, on-device background removal, colour detection and Apple Intelligence auto-tagging, filters.
- **Outfit builder**: drag your items onto a canvas, save and tag outfits.
- **Wishlist + match check**: add from a shop screenshot, see what you already own that is similar, and what a new item goes with.
- **Cool-off timer**: wait 7 / 14 / 30 days, then decide: Bought or Skipped (money saved).
- **Cost per wear + stats**: log what you wear and see what was worth it.

## Docs
| File | What's inside |
|---|---|
| [`project.md`](project.md) | Problem, users, MVP, non-goals, tech stack, epics and user stories |
| [`SPEC.md`](SPEC.md) | Architecture, data model, screens, business rules, testing |
| [`DESIGN.md`](DESIGN.md) | Colours, typography, components, screen layouts |
| [`CLAUDE.md`](CLAUDE.md) | Engineering rules and workflow for contributors and Claude Code |

## Tech stack
Expo development build (React Native, TypeScript) · Swift Expo Module (Vision + Apple Intelligence Foundation Models) · expo-router · Supabase (Postgres, anonymous auth, Storage) · TanStack Query · Reanimated · Jest · GitHub Actions · EAS Update

## Getting started
Requirements: Mac with Xcode, an iPhone on iOS 17+ (Apple Intelligence features: iPhone 15 Pro or newer, iOS 26+).
```bash
git clone <repo-url> && cd hanger
npm install
cp .env.example .env          # fill in your Supabase URL and anon key
npx supabase start            # local backend (Docker required)
npx expo run:ios --device     # build onto your iPhone (Mac + Xcode required)
npx expo start --dev-client   # later: just start Metro
```

## Status
📄 Planning: documentation done. Implementation follows the release plan in `project.md` (Steps 1–11).
