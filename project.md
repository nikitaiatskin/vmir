# Hanger — Digital Wardrobe

> An iPhone app that keeps your whole wardrobe in your pocket, so every new purchase is a deliberate one.

---

## 1. What problem am I solving? (one sentence)

People buy clothes that duplicate what they already own or don't go with anything in their closet, because when they shop they can't see their wardrobe in front of them.

---

## 2. Who are my users?

**Primary user: the fashion-conscious shopper (18–35)**
- Buys clothes several times a month, online (Zara, H&M, COS, Zalando, Vinted) and in stores.
- Has a full closet and still feels like they have "nothing to wear".
- Regularly ends up with a third black t-shirt or a jacket that matches nothing.
- Lives on their iPhone and takes photos of everything anyway.

**Secondary user: the mindful / budget shopper**
- Wants to buy less and better, for financial or sustainability reasons.
- Cares whether a 120 € coat was actually worth it.
- Wants something to slow down impulse purchases.

**Personas**

| Persona | Situation | What they need from Hanger |
|---|---|---|
| **Lucia, 24, student** | Scrolls Zalando at night, orders on impulse, returns half of it | A wishlist with a cool-off period and a quick "do I already own this?" check |
| **Martin, 31, office worker** | Wears the same 5 outfits; the rest of the closet is forgotten | A visual wardrobe and outfit builder to rediscover what he owns |
| **Eva, 28, sustainable fashion fan** | Buys second-hand, tracks what she spends | Cost-per-wear statistics and spending overview |

**Users are NOT:** stylists, fashion brands, shops or resellers (see non-goals).

---

## 3. How do I want to solve it? (MVP)

The MVP is a **single-user iPhone app** with five connected features. Every feature answers one question the user asks while shopping or getting dressed.

| # | Feature | Question it answers | What the MVP does |
|---|---|---|---|
| 1 | **Digital wardrobe** | *What do I own?* | Add an item with the camera or from the photo library. The background is removed automatically. Item details: category, colours, brand, size, price, season. Grid view with filters by category, colour and season. |
| 2 | **Outfit builder** | *What can I wear it with?* | Drag items onto a canvas, move, scale and layer them like a collage. Save outfits and browse them in a gallery. |
| 3 | **Wishlist + match check** | *Should I buy this?* | Save an item you are considering (photo or link, price, shop). The app shows similar items you already own (same category and colour) and how many of your items share its colour palette. |
| 4 | **Cool-off timer** | *Do I really still want it?* | Every wishlist item gets a waiting period (7 / 14 / 30 days). A local notification asks "Still want it?" → **Bought** (moves to the wardrobe) or **Skip** (counts as money saved). |
| 5 | **Cost per wear + stats** | *Was it worth it?* | One-tap "Worn today" on items or a whole outfit. Each item shows times worn and cost per wear. The stats screen shows money spent, money saved by skipped wishlist items, most-worn and never-worn items. |

**Supporting features that make the five work:**
- **Colour palette extraction**: the main colours of each photo are detected automatically, which powers filters and the match check.
- **Size notes per brand**: e.g. "Zara: M, COS: S, Levi's: W30 L32", shown when adding a wishlist item from that brand.
- **Anonymous account**: no sign-up screen. The user starts immediately and the data is stored in the cloud and survives reinstalling the app.

**Definition of done for the MVP:** a user can photograph 20 items in under 10 minutes, build an outfit, add a wishlist item, get the reminder, mark it as bought, log wears and see cost per wear, all on a real iPhone via Expo Go.

---

## 4. What will NOT be in the MVP (non-goals), and why

| Non-goal | Why not now |
|---|---|
| **Android and web versions** | The target users are on iPhone. Expo keeps Android possible later, but testing two platforms doubles QA for no MVP value. |
| **AI outfit recommendations / "style me"** | Needs a lot of data and an ML model. The value has to be proven first with manual outfits. |
| **Social features** (sharing outfits, followers, likes, comments) | Adds moderation, privacy and abuse problems. The core value is personal and works without other people. |
| **Shop integrations, price tracking, affiliate links, in-app buying** | Every shop has a different API or none. Scraping is fragile and legally grey. Pasting a link is enough for the MVP. |
| **Automatic import from e-mail receipts or bank statements** | Requires access to very sensitive data and per-provider parsers. Manual entry is fine for a few items a month. |
| **Weather-based "outfit of the day"** | Needs location permission and a weather API. It is nice to have but does not help with the core shopping problem. |
| **Full user accounts (e-mail / Apple sign-in)** | An anonymous session removes onboarding friction. Linking an account to move data to a new phone comes after the MVP. |
| **Sharing a wardrobe with family / partner** | Needs shared permissions and conflict handling. It is a single-user app first. |
| **Offline-first sync** | Needs a sync engine and conflict resolution. The MVP shows cached images but requires a connection to save changes. |
| **Publishing to the App Store** | Costs a paid developer account and a review process. The MVP is distributed through Expo Go / EAS Update for testing. |

---

## 5. What technologies do I need?

| Area | Technology | Why |
|---|---|---|
| **App framework** | **Expo** (React Native) + **TypeScript** | One codebase, fast iteration, runs on a real iPhone instantly through Expo Go, with no Xcode build needed during development. |
| **Navigation** | **expo-router** (file-based routes in `app/`) | Screens are files, deep links come for free. |
| **Camera & photos** | `expo-image-picker`, `expo-image-manipulator`, `expo-image` | Take or pick photos, resize them before upload, fast cached image rendering. |
| **Outfit canvas** | `react-native-gesture-handler` + `react-native-reanimated`, `react-native-view-shot` | Smooth drag / pinch / rotate at 60 fps. The finished outfit is saved as an image. |
| **Notifications** | `expo-notifications` (local) | Cool-off reminders scheduled on the device, no push server needed. |
| **Backend** | **Supabase**: Postgres, Auth (anonymous sign-in), Storage, Edge Functions | Database, file storage and auth in one place. Row Level Security keeps every user's data private. Free tier is enough for the MVP. |
| **Image processing** | Supabase **Edge Function** (Deno) calling a **background-removal API** (remove.bg or similar) + dominant-colour extraction | Works inside Expo Go (no native module). API keys stay on the server, never in the app. |
| **Server state** | **TanStack Query** | Caching, loading states and refetching for Supabase calls. |
| **Validation** | **zod** | One schema for forms and API data. |
| **Testing** | **Jest** + **React Native Testing Library**; SQL tests for RLS policies | Business logic (cost per wear, match score, cool-off) is unit tested. Screens get smoke tests. |
| **Code quality** | ESLint, Prettier, `tsc --noEmit` | Same rules for every contributor (human or AI). |
| **CI/CD** | **GitHub Actions** (lint, typecheck, test, apply DB migrations) + **EAS Update** | Every push is checked. The main branch is published to a stable Expo Go link. |
| **Dev tooling** | **Claude Code** with `CLAUDE.md` project rules | AI pair programmer following the project conventions. |

**Estimated running cost for the MVP:** 0 € for Supabase and Expo (free tiers), plus background removal per image (free quota, then roughly a few cents per photo). A fallback keeps the original photo if the API fails or the quota runs out.

---

## 6. Initiative, epics and user stories

### Initiative
**Help people shop smarter by making their wardrobe visible at the moment of purchase.**
Success metric for the MVP: test users skip at least 1 in 3 wishlist items after the cool-off period, and at least 50 % of wardrobe items get worn (logged) within the first month.

### Epic 0 — Foundation
- **US-0.1** As a new user, I want to open the app and start right away without signing up, so that I don't give up before I see any value.
- **US-0.2** As a user, I want my data to stay when I reinstall the app or lose connection briefly, so that I don't lose my wardrobe.
- **US-0.3** As a developer, I want lint, typecheck, tests and migrations to run on every push, so that main is always working.

### Epic 1 — Digital wardrobe
- **US-1.1** As a user, I want to take a photo of a clothing item, so that I can add it to my wardrobe in seconds.
- **US-1.2** As a user, I want to pick several photos from my library at once, so that I can add old photos quickly.
- **US-1.3** As a user, I want the background removed automatically, so that my wardrobe looks clean and items can be combined.
- **US-1.4** As a user, I want to set category, brand, size, price, season and purchase date, so that I can find and evaluate items later.
- **US-1.5** As a user, I want colours detected automatically (and editable), so that I don't have to tag them myself.
- **US-1.6** As a user, I want to filter my wardrobe by category, colour and season, so that I can find things fast.
- **US-1.7** As a user, I want to edit, archive (sold / donated) or delete an item, so that my wardrobe stays accurate.

### Epic 2 — Outfit builder
- **US-2.1** As a user, I want to drag items from my wardrobe onto a canvas, so that I can see how they look together.
- **US-2.2** As a user, I want to move, resize, rotate and reorder items on the canvas, so that the outfit looks realistic.
- **US-2.3** As a user, I want to save an outfit with a name and tags (work, party, casual), so that I can reuse it.
- **US-2.4** As a user, I want to browse saved outfits in a gallery and filter them by tag, so that I can decide what to wear quickly.
- **US-2.5** As a user, I want to see all outfits that contain a given item, so that I know how versatile it is.

### Epic 3 — Wishlist and match check
- **US-3.1** As a user, I want to add an item I'm considering with a photo, link, price and shop, so that I don't forget it.
- **US-3.2** As a user, I want to share a product page from Safari into the app, so that adding is one step.
- **US-3.3** As a user, I want to see similar items I already own, so that I don't buy a duplicate.
- **US-3.4** As a user, I want to see how many of my items match the new item's colours, so that I know whether it fits my wardrobe.
- **US-3.5** As a user, I want to store my size for each brand and see it when I add a wishlist item from that brand, so that I order the right size.

### Epic 4 — Cool-off timer
- **US-4.1** As a user, I want each wishlist item to get a waiting period (7 / 14 / 30 days), so that I avoid impulse buys.
- **US-4.2** As a user, I want a notification when the waiting period ends, so that I make a conscious decision.
- **US-4.3** As a user, I want to mark the item as **Bought** and have it move into my wardrobe with its details, so that I don't enter it twice.
- **US-4.4** As a user, I want to mark the item as **Skipped** and see the money saved, so that I feel rewarded for not buying.

### Epic 5 — Cost per wear and stats
- **US-5.1** As a user, I want to tap "Worn today" on an item or an outfit, so that tracking takes one second.
- **US-5.2** As a user, I want to see how many times I wore an item and its cost per wear, so that I know if it was worth it.
- **US-5.3** As a user, I want a wear calendar, so that I can see and fix what I logged.
- **US-5.4** As a user, I want a stats screen with money spent, money saved, most-worn and never-worn items, so that I learn from my habits.

### Release plan (build steps)

| Step | Content | Epic |
|---|---|---|
| 1 | Expo project setup, Supabase anonymous sign-in, CI | 0 |
| 2 | Database schema, RLS, storage buckets | 0 |
| 3 | Add item: camera / library, upload, item form | 1 |
| 4 | Edge Function: background removal + colour extraction | 1 |
| 5 | Wardrobe grid, filters, item detail, edit / archive | 1 |
| 6 | Outfit canvas and saving outfits | 2 |
| 7 | Outfit gallery, tags, "outfits with this item" | 2 |
| 8 | Wishlist, share from Safari, brand sizes, match check | 3 |
| 9 | Cool-off notifications, Bought / Skipped flow | 4 |
| 10 | Wear logging, calendar, cost per wear, stats screen | 5 |
| 11 | Polish: empty states, error states, accessibility, Expo Go link | all |
