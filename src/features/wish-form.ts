import { z } from 'zod';

import type { ItemCategory } from '@/types/database';
import type { CooloffDays } from '@/types/domain';

import { parsePriceToCents } from './money';

export type WishDraft = {
  category: ItemCategory | null;
  name: string;
  brand: string;
  shop: string;
  url: string;
  price: string;
  currency: string;
  cooloffDays: CooloffDays;
};

export const emptyWish = (cooloffDays: CooloffDays = 14): WishDraft => ({
  category: null,
  name: '',
  brand: '',
  shop: '',
  url: '',
  price: '',
  currency: 'EUR',
  cooloffDays,
});

const schema = z.object({
  category: z.enum(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'], {
    message: 'Choose a category',
  }),
  name: z.string().trim().max(80),
  brand: z.string().trim().max(60),
  shop: z.string().trim().max(60),
  url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
      'Paste a full link starting with https://',
    ),
  price: z
    .string()
    .trim()
    .refine((v) => v === '' || parsePriceToCents(v) !== null, 'Enter a price like 49.99'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  cooloffDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

/** Shop name from a product link, e.g. "https://www.zalando.sk/…" → "Zalando". */
export function shopFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, '');
    const name = host.split('.').slice(-2, -1)[0] ?? host;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return '';
  }
}

export function wishToColumns(d: WishDraft) {
  const parsed = schema.safeParse(d);
  if (!parsed.success) {
    const errors: Partial<Record<keyof WishDraft, string>> = {};
    for (const issue of parsed.error.issues)
      errors[issue.path[0] as keyof WishDraft] ??= issue.message;
    return { ok: false as const, errors };
  }
  const v = parsed.data;
  return {
    ok: true as const,
    columns: {
      category: v.category,
      name: v.name || null,
      brand: v.brand || null,
      shop: v.shop || (v.url ? shopFromUrl(v.url) || null : null),
      url: v.url || null,
      price_cents: parsePriceToCents(v.price),
      currency: v.currency,
      cooloff_days: v.cooloffDays,
    },
  };
}
