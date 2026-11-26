# SPEC — Hanger technical specification

This document describes **how** the MVP from `project.md` is built: data model, security, screens, flows and business rules. If code and this spec disagree, fix one of them in the same PR.

---

## 1. Architecture

```
┌────────────────────────┐        ┌──────────────────────────────────────┐
│  iPhone (Expo app)     │        │  Supabase                            │
│                        │  HTTPS │                                      │
│  expo-router screens   │───────▶│  Auth (anonymous sign-in)            │
│  TanStack Query cache  │        │  Postgres + Row Level Security       │
│  local notifications   │        │  Storage: item-photos, outfit-images │
│                        │        │  Edge Function: process-item-image ──┼──▶ background-removal API
└────────────────────────┘        └──────────────────────────────────────┘
```

- The app talks to Supabase directly with the **anon key** + user JWT. Every table is protected by RLS.
- Secrets (background-removal API key, service role key) live **only** in Edge Function secrets.
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
supabase/
  migrations/         SQL migrations (timestamped, never edited after merge)
  functions/
    process-item-image/
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

## 3. Edge Function `process-item-image`

**Input:** `{ table: 'items' | 'wishes', id: uuid }` with the user's JWT.

1. Verify that the row belongs to the caller.
2. Download `photo_path` from Storage.
3. Call the background-removal API → PNG with transparency. Save as `{user_id}/{id}_cutout.png`.
4. Extract up to **3 dominant colours** from non-transparent pixels (k-means on a 64×64 downscale, ignoring clusters < 8 % of pixels). Round to hex.
5. Update the row: `cutout_path`, `colors` (only if the user hasn't edited them yet), `processing_status = 'done'`.
6. On any error: `processing_status = 'failed'`; the app shows the original photo and a "Retry" button.

Timeouts: 20 s for the API call. The app polls/refetches the row while `pending`.

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
| Manual | Expo Go on a real iPhone | camera, notifications, canvas gestures (checklist in each PR) |

CI (GitHub Actions) on every push and PR: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test`. On `main`: apply migrations to Supabase, then `eas update --channel main`.
