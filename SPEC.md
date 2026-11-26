# SPEC — Hanger technical specification

This document describes **how** the MVP from `project.md` is built: data model, security, screens, flows and business rules. If code and this spec disagree, fix one of them in the same PR.

---

## 1. Architecture

```
┌──────────────────────────────────┐        ┌──────────────────────────────────────┐
│  iPhone (Expo development build) │        │  Supabase                            │
│                                  │  HTTPS │                                      │
│  expo-router screens (TS)        │───────▶│  Auth (anonymous sign-in)            │
│  TanStack Query cache            │        │  Postgres + Row Level Security       │
│  local notifications             │        │  Storage: item-photos, outfit-images │
│  ┌────────────────────────────┐  │        └──────────────────────────────────────┘
│  │ Swift module hanger-vision │  │
│  │  Vision: cutout, OCR       │  │
│  │  Foundation Models (AI)    │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

- The app talks to Supabase directly with the **anon key** + user JWT. Every table is protected by RLS.
- All image processing and AI run **on the device**. Only the original photo and the finished cutout are uploaded. There are no third-party API keys.
- The service role key is never in the app; it is used only by CI for migrations.
- Notifications are **local** (`expo-notifications`), so no push server is needed.

### Folder structure

```
app/                  expo-router routes (screens only, thin)
  (tabs)/
    wardrobe/         index.tsx, [itemId].tsx
    outfits/          index.tsx, builder.tsx, [outfitId].tsx
    wishlist/         index.tsx, [wishId].tsx
    stats/            index.tsx
  add-item.tsx        modal
  _layout.tsx
src/
  api/                Supabase queries and mutations (one file per table)
  components/         reusable UI components
  features/           feature logic (canvas, matching, cool-off, cost-per-wear)
  lib/                supabase client, notifications, image helpers
  theme/              colours, spacing, typography tokens (see DESIGN.md)
  types/              generated DB types + zod schemas
modules/
  hanger-vision/      local Expo Module (Swift): Vision + Foundation Models bridge
    ios/              HangerVisionModule.swift, ItemTagger.swift, ScreenshotReader.swift
    src/              TypeScript API + types
supabase/
  migrations/         SQL migrations (timestamped, never edited after merge)
  tests/              SQL / RLS tests
__tests__/            Jest unit + component tests
```

---

## 2. Data model (Postgres)

All tables have `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users`, `created_at timestamptz default now()`.

### `items` — clothes in the wardrobe
| Column | Type | Notes |
|---|---|---|
| `category` | enum `item_category` | `top`, `bottom`, `dress`, `outerwear`, `shoes`, `bag`, `accessory` |
| `name` | text null | e.g. "White linen shirt" |
| `brand` | text null | |
| `size` | text null | free text ("M", "38", "W30 L32") |
| `price_cents` | integer null | ≥ 0 |
| `currency` | char(3) | default `EUR` |
| `purchased_at` | date null | |
| `seasons` | `season[]` | `spring`, `summer`, `autumn`, `winter` |
| `colors` | text[] | hex values, max 3, detected then editable |
| `photo_path` | text | original photo in Storage |
| `cutout_path` | text null | background-removed PNG; null while processing or if it failed |
| `processing_status` | enum | `pending`, `done`, `failed` |
| `status` | enum | `active`, `archived` |
| `source_wish_id` | uuid null | set when created from a wishlist item |

### `outfits`
| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `tags` | text[] | `work`, `casual`, `party`, `sport`, or custom |
| `preview_path` | text | PNG snapshot of the canvas |

### `outfit_items` — placement on the canvas
| Column | Type | Notes |
|---|---|---|
| `outfit_id` | uuid → outfits (cascade) | |
| `item_id` | uuid → items (cascade) | |
| `x`, `y` | real | relative 0–1 to canvas size |
| `scale` | real | 0.2–3 |
| `rotation` | real | degrees |
| `z_index` | integer | layer order |

### `wishes` — wishlist
| Column | Type | Notes |
|---|---|---|
| `name`, `brand`, `shop`, `url` | text null | |
| `category` | `item_category` | needed for the match check |
| `price_cents`, `currency` | | |
| `photo_path`, `cutout_path`, `colors`, `processing_status` | | same as items |
| `cooloff_days` | smallint | 7, 14 or 30 |
| `decide_at` | timestamptz | `created_at + cooloff_days` |
| `decision` | enum null | `bought`, `skipped` |
| `decided_at` | timestamptz null | |

### `brand_sizes`
| Column | Type | Notes |
|---|---|---|
| `brand` | text | unique per user (case-insensitive) |
| `category` | `item_category` null | null = all categories |
| `size` | text | |

### `wears` — wear log
| Column | Type | Notes |
|---|---|---|
| `item_id` | uuid → items (cascade) | |
| `worn_on` | date | unique (`item_id`, `worn_on`) — max one wear per item per day |
| `outfit_id` | uuid null | set when logged through an outfit |

### Row Level Security
Every table: `enable row level security` + one policy per operation:
`using (user_id = auth.uid())` and `with check (user_id = auth.uid())`.
Storage buckets `item-photos` and `outfit-images` are private; object paths start with `{user_id}/`, and policies check `(storage.foldername(name))[1] = auth.uid()::text`.
RLS is covered by SQL tests in `supabase/tests/` (user A can never read or write user B's rows).

---

## 3. On-device processing: module `hanger-vision`

Local Expo Module written in Swift. Minimum iOS: **17** (Vision subject lifting). Apple Intelligence features: **iOS 26+** on a device where `SystemLanguageModel.default.availability == .available`.

### TypeScript API
```ts
isAIAvailable(): Promise<'available' | 'notSupported' | 'turnedOff' | 'notReady'>
cutout(photoUri: string): Promise<{ uri: string }>            // PNG with transparency
dominantColors(imageUri: string, max?: number): Promise<string[]> // hex, from non-transparent pixels
tagItem(imageUri: string): Promise<ItemSuggestion>             // throws AI_UNAVAILABLE
readScreenshot(imageUri: string): Promise<WishSuggestion>      // throws AI_UNAVAILABLE
```

### Add-item pipeline
1. Resize the photo (max 1600 px) → upload the original to Storage, row created with `processing_status = 'pending'`.
2. `cutout()` → Vision `VNGenerateForegroundInstanceMaskRequest`, keep the largest instance, crop to its bounds. Upload as `{user_id}/{id}_cutout.png`. If no subject is found → keep the original photo, `processing_status = 'failed'`, show "Retry".
3. `dominantColors()` → up to **3 colours**, k-means on a 64×64 downscale, ignoring clusters < 8 % of pixels.
4. If `isAIAvailable() === 'available'` → `tagItem(cutout)` and pre-fill the form. Otherwise the form stays empty except colours.
5. Save → `processing_status = 'done'`.

### `tagItem` — Foundation Models
Guided generation into a `@Generable` Swift struct, so the output is always valid:
```swift
@Generable struct ItemSuggestion {
  @Guide(.anyOf(["top","bottom","dress","outerwear","shoes","bag","accessory"])) var category: String
  @Guide(description: "Short name, max 4 words, e.g. 'White linen shirt'") var name: String
  @Guide(.anyOf(["spring","summer","autumn","winter"]), .count(1...4)) var seasons: [String]
  @Guide(description: "Material if clearly visible, else empty") var material: String
}
```
- Instructions: *"You tag clothing photos for a wardrobe app. Describe only what is visible. Never guess brand or size."*
- The image is passed as a multimodal prompt (iOS 27). On iOS 26 (text only), Vision `VNClassifyImageRequest` labels are passed as text instead.
- Timeout 10 s → on timeout or error the form is simply left for manual input. AI errors are never shown as blocking errors.
- Suggestions are visually marked ("✨ Suggested") until the user confirms or edits them.

### `readScreenshot` — wishlist
Vision OCR (`VNRecognizeTextRequest`, accurate) → recognised lines → Foundation Models guided generation into `WishSuggestion { brand, name, price, currency }`. The product image is cropped with `cutout()` from the same screenshot.

---

## 4. Screens

| Route | Screen | Main content |
|---|---|---|
| `/(tabs)/wardrobe` | Wardrobe | 3-column grid of cutouts, filter chips (category, colour, season), FAB "+" |
| `/add-item` | Add item (modal) | Camera / Library choice → preview → form (category required, rest optional) |
| `/(tabs)/wardrobe/[itemId]` | Item detail | Large image, details, wear count, cost per wear, "Worn today", outfits with this item, edit / archive / delete |
| `/(tabs)/outfits` | Outfit gallery | 2-column grid of previews, tag filter, "New outfit" |
| `/(tabs)/outfits/builder` | Outfit builder | Canvas (top 65 %), item drawer with category tabs (bottom), save sheet |
| `/(tabs)/outfits/[outfitId]` | Outfit detail | Preview, items list, "Worn today", edit, delete |
| `/(tabs)/wishlist` | Wishlist | Sections "Waiting" (with countdown) and "Decide now", history of bought / skipped |
| `/(tabs)/wishlist/[wishId]` | Wish detail | Image, price, link, size hint, **Match check**, Bought / Skip buttons when due |
| `/(tabs)/stats` | Stats | Money spent, money saved, avg cost per wear, most worn, never worn, wear calendar |
| `/settings` | Settings | Brand sizes, currency, default cool-off, notifications, delete all data |

Each list screen has defined **empty**, **loading** (skeleton) and **error** (retry) states.

---

## 5. Business rules

### Cost per wear
```
costPerWear(item) = price / max(wearCount, 1)
```
- No price → show "—".
- Shown with the currency, rounded to 2 decimals.

### Match check (wishlist → wardrobe)
For a wish `w` and every active item `i`:
- **Similar items** = items with the same `category` **and** at least one colour within ΔE (CIEDE2000) ≤ 12 of a colour of `w`. Sorted by colour distance, max 6 shown.
  If ≥ 1 similar item exists, show the warning "You already own something similar".
- **Goes with** = items of a *different* category whose colours are "compatible" with `w`:
  a colour pair is compatible if either colour is neutral (saturation < 15 % or black / white / grey / beige / navy range), or the hue difference is < 30° (analogous) or 150–210° (complementary).
- **Match score** = number of "goes with" items. Label: 0 → "Doesn't match much yet", 1–4 → "Goes with a few things", 5+ → "Goes with lots of your wardrobe".

### Cool-off
- `decide_at = created_at + cooloff_days`. A local notification is scheduled for `decide_at` at 18:00 local time.
- Before `decide_at`, Bought / Skip buttons are hidden behind "Decide early?" (one extra tap, on purpose).
- **Bought** → create an `items` row copying category, brand, price, photo, cutout, colours; set `source_wish_id`; `decision = bought`.
- **Skipped** → `decision = skipped`; the price is added to "Money saved".
- Deleting a wish cancels its notification. Notification IDs are stored locally (AsyncStorage) by `wish.id`.

### Wears
- "Worn today" on an item → upsert into `wears` for today.
- "Worn today" on an outfit → one wear for each of its items, with `outfit_id`.
- A wear can be removed from the calendar.

### Images
- Before upload, resize to max 1600 px on the long side, JPEG quality 0.8.
- Cutouts are PNG. Display uses `expo-image` with disk cache.

---

## 6. Non-functional requirements

- Wardrobe grid scrolls smoothly with 300 items (FlashList or FlatList with fixed item size).
- Outfit canvas runs gestures on the UI thread (Reanimated worklets).
- Accessibility: every button has an `accessibilityLabel`; Dynamic Type supported; contrast AA.
- Privacy: no analytics SDK in the MVP; "Delete all my data" removes all rows and files.
- Errors are shown to the user in plain language and never as raw error codes.

---

## 7. Testing

| Level | Tool | What |
|---|---|---|
| Unit | Jest | cost per wear, match check (colour distance, compatibility), cool-off dates, zod schemas |
| Component | React Native Testing Library | item form validation, wishlist decision flow, empty states |
| Database | SQL tests (`supabase test db`) | RLS isolation between two users, constraints |
| Native module | XCTest in `modules/hanger-vision/ios/Tests` | cutout on sample photos, colour extraction, `@Generable` decoding |
| AI quality | Fixed set of 30 sample photos + expected category | auto-tag accuracy ≥ 80 %, run manually before each release |
| Manual | Development build on a real iPhone (one with and one without Apple Intelligence) | camera, cutout, auto-tag + fallback, notifications, canvas gestures (checklist in each PR) |

CI (GitHub Actions) on every push and PR: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test`. On `main`: apply migrations to Supabase, then `eas update --channel main` (JS changes). Changes in `modules/` need a new `eas build --profile development`.
