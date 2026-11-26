import { z } from 'zod';

import type { ItemCategory, ItemRow, Season } from '@/types/database';

import { colorName } from './color';
import { parsePriceToCents } from './money';

export const itemFormSchema = z.object({
  category: z.enum(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'], {
    message: 'Choose a category',
  }),
  name: z.string().trim().max(80),
  brand: z.string().trim().max(60),
  size: z.string().trim().max(20),
  price: z
    .string()
    .trim()
    .refine((v) => v === '' || parsePriceToCents(v) !== null, 'Enter a price like 49.99'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  purchasedAt: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
      'Use the format 2026-11-26',
    ),
  seasons: z.array(z.enum(['spring', 'summer', 'autumn', 'winter'])),
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).max(3),
});

export type ItemFormValues = z.input<typeof itemFormSchema>;
export type ItemFormDraft = Omit<ItemFormValues, 'category'> & { category: ItemCategory | null };

export const emptyItemForm: ItemFormDraft = {
  category: null,
  name: '',
  brand: '',
  size: '',
  price: '',
  currency: 'EUR',
  purchasedAt: '',
  seasons: [],
  colors: [],
};

export function itemToForm(item: ItemRow): ItemFormDraft {
  return {
    category: item.category,
    name: item.name ?? '',
    brand: item.brand ?? '',
    size: item.size ?? '',
    price: item.price_cents == null ? '' : (item.price_cents / 100).toFixed(2),
    currency: item.currency,
    purchasedAt: item.purchased_at ?? '',
    seasons: item.seasons,
    colors: item.colors,
  };
}

/** Validates a draft and maps it to database columns. */
export function formToColumns(draft: ItemFormDraft) {
  const parsed = itemFormSchema.safeParse(draft);
  if (!parsed.success) {
    const errors: Partial<Record<keyof ItemFormDraft, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ItemFormDraft;
      errors[key] ??= issue.message;
    }
    return { ok: false as const, errors };
  }
  const v = parsed.data;
  return {
    ok: true as const,
    columns: {
      category: v.category,
      name: v.name || null,
      brand: v.brand || null,
      size: v.size || null,
      price_cents: parsePriceToCents(v.price),
      currency: v.currency,
      purchased_at: v.purchasedAt || null,
      seasons: v.seasons as Season[],
      colors: v.colors.map((c) => c.toUpperCase()),
    },
  };
}

export type ItemFilter = {
  category: ItemCategory | null;
  color: string | null;
  season: Season | null;
};

/** Wardrobe filters (US-1.6). Colour matches by plain colour name, so "navy" matches all navies. */
export function filterItems<T extends Pick<ItemRow, 'category' | 'colors' | 'seasons'>>(
  items: readonly T[],
  f: ItemFilter,
): T[] {
  const wanted = f.color ? colorName(f.color) : null;
  return items.filter(
    (i) =>
      (!f.category || i.category === f.category) &&
      (!f.season || i.seasons.length === 0 || i.seasons.includes(f.season)) &&
      (!wanted || i.colors.some((c) => colorName(c) === wanted)),
  );
}

/** Display name: user name, else "Brand category", else category. */
export function itemTitle(item: Pick<ItemRow, 'name' | 'brand' | 'category'>): string {
  if (item.name) return item.name;
  const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
  return item.brand ? `${item.brand} ${item.category}` : cat;
}
