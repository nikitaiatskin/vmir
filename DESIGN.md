# DESIGN — Hanger visual design

The clothes are the colour. The interface stays quiet, light and editorial, like a clean fashion lookbook, so that the user's items stand out.

---

## 1. Principles

1. **Items first.** Cutouts on calm backgrounds. No heavy cards, borders or shadows around clothes.
2. **One primary action per screen.** "Add item", "Save outfit", "Decide" are always obvious.
3. **Friction only where it helps.** Adding an item is fast; buying a wish takes one extra, deliberate tap.
4. **Native feel.** iOS navigation patterns, sheets, haptics and SF Symbols-style icons.

---

## 2. Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF8F5` (warm off-white) | `#121110` | app background |
| `surface` | `#FFFFFF` | `#1C1B19` | sheets, inputs |
| `surfaceMuted` | `#F0EDE8` | `#262421` | item tiles behind cutouts |
| `text` | `#1A1A1A` | `#F2F0EC` | primary text |
| `textMuted` | `#6E6A64` | `#A39E96` | secondary text |
| `border` | `#E4E0D9` | `#33302C` | dividers, inputs |
| `accent` | `#1A1A1A` | `#F2F0EC` | primary buttons (black / white, fashion style) |
| `highlight` | `#C8553D` (terracotta) | `#E07A5F` | badges, countdowns, "saved money" |
| `success` | `#4F7A5A` | `#7FB08A` | bought, positive stats |
| `warning` | `#B8860B` | `#E0B54A` | "You already own something similar" |
| `danger` | `#B3261E` | `#F2B8B5` | delete |

All text / background pairs meet WCAG AA.

---

## 3. Typography

| Style | Font | Size / line height | Use |
|---|---|---|---|
| `display` | Serif (New York / `serif`) | 34 / 40, semibold | screen titles ("Wardrobe") |
| `title` | Serif | 22 / 28, semibold | section titles, item name |
| `body` | System (SF Pro) | 16 / 22 | default text |
| `label` | System | 13 / 18, medium, +0.3 letter-spacing, uppercase | chips, small labels |
| `number` | System, tabular figures | 28 / 32, semibold | prices, stats |

Supports Dynamic Type; no fixed heights on text containers.

---

## 4. Spacing, shape, motion

- Spacing scale: `4, 8, 12, 16, 24, 32, 48`. Screen padding: 16.
- Radius: tiles 12, buttons 999 (pill), sheets 20.
- Elevation: none on tiles; a soft shadow only on the FAB and floating canvas toolbar.
- Motion: 200–250 ms ease-out; spring for canvas items; light haptic on "Worn today", save and decisions.

---

## 5. Components

| Component | Description |
|---|---|
| **ItemTile** | Square, `surfaceMuted` background, cutout centred with 12 % padding. Pending: shimmer. Failed: original photo + small retry icon. |
| **FilterChips** | Horizontally scrolling pills. Colour chips show a colour dot. Selected = `accent` background. |
| **FAB** | 56 pt circle, `accent`, "+" icon, bottom right above the tab bar. |
| **PrimaryButton** | Full width pill, `accent` background, 52 pt high. |
| **Sheet** | Bottom sheet for forms and confirmations, with a grab handle. |
| **CountdownBadge** | "5 days left" in `highlight`; "Decide now" when due. |
| **MatchCard** | On wish detail: warning row for similar items + horizontal row of "goes with" items + score label. |
| **StatTile** | Big `number` + `label` below; used in a 2-column grid. |
| **EmptyState** | Simple line illustration, one sentence, one button. |

---

## 6. Key screens (layout)

**Wardrobe**
```
Wardrobe                      ⚙
[All][Tops][Bottoms][Shoes]…   ← category chips
● ● ● ● ●                     ← colour chips
┌───┐┌───┐┌───┐
│ 👕 ││ 👖 ││ 👟 │             ← 3-column grid
└───┘└───┘└───┘
                          (+)
[Wardrobe] [Outfits] [Wishlist] [Stats]
```

**Outfit builder**
```
✕  New outfit            Save
┌──────────────────────────┐
│        canvas            │   ← drag / pinch / rotate
│      (warm off-white)    │      long-press = layer menu
└──────────────────────────┘
[Tops][Bottoms][Shoes][Bags]
 ▢ ▢ ▢ ▢ ▢ ▢  →              ← tap or drag onto canvas
```

**Wish detail (decision due)**
```
[ cutout image ]
COS · 89 €  · size S (your COS size)
⚠ You already own something similar
   ▢ ▢
Goes with 7 things in your wardrobe
   ▢ ▢ ▢ ▢ ▢ →
[ Skip — save 89 € ]   [ Bought ]
```

---

## 7. Empty states copy

| Screen | Text | Button |
|---|---|---|
| Wardrobe | "Your wardrobe is empty. Start with the 5 things you wear most." | Add first item |
| Outfits | "Combine your clothes into outfits." | Create outfit |
| Wishlist | "Want something? Park it here and decide later." | Add to wishlist |
| Stats | "Log what you wear to see what's worth it." | Go to wardrobe |

---

## 8. App icon & name

- Name: **Hanger**.
- Icon: a minimal black hanger line on the warm off-white background.
