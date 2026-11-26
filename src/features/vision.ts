import { HangerVision, type AIAvailability } from 'hanger-vision';
import { z } from 'zod';

import type { ItemCategory, Season } from '@/types/database';

import { colorName, dominantColors } from './color';
import { findPriceInText, parsePriceToCents } from './money';

/**
 * Safe wrappers around the native module (CLAUDE.md "Native module & Apple Intelligence"):
 * every call has a fallback, a timeout, and never throws into the UI for AI problems.
 */

export const AI_TIMEOUT_MS = 10_000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

export async function getAIAvailability(): Promise<AIAvailability> {
  if (!HangerVision) return 'notSupported';
  try {
    return await HangerVision.aiAvailability();
  } catch {
    return 'notSupported';
  }
}

/** Background removal. Returns the cutout file URI, or null if there is no subject or no module. */
export async function removeBackground(uri: string): Promise<string | null> {
  if (!HangerVision) return null;
  try {
    return await withTimeout(HangerVision.cutout(uri), 20_000);
  } catch {
    return null;
  }
}

/** Up to 3 dominant colours of the (cut-out) image. Empty when unavailable. */
export async function extractColors(uri: string): Promise<string[]> {
  if (!HangerVision) return [];
  try {
    const samples = await HangerVision.samplePixels(uri, 64);
    return dominantColors(samples);
  } catch {
    return [];
  }
}

const CATEGORY = z.enum(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory']);
const SEASON = z.enum(['spring', 'summer', 'autumn', 'winter']);

const itemSuggestionSchema = z.object({
  category: CATEGORY,
  name: z.string().trim().max(60),
  seasons: z.array(SEASON).max(4),
});

export type ItemSuggestion = {
  category: ItemCategory;
  name: string;
  seasons: Season[];
};

/**
 * Apple Intelligence auto-tagging (US-1.8). Returns null when AI is not available,
 * times out or fails — the form simply stays editable (US-1.9).
 */
export async function suggestItem(uri: string, colors: string[]): Promise<ItemSuggestion | null> {
  if (!HangerVision || (await getAIAvailability()) !== 'available') return null;
  try {
    const labels = await HangerVision.classify(uri);
    const raw = await withTimeout(
      HangerVision.tagItem(labels, [...new Set(colors.map(colorName))]),
      AI_TIMEOUT_MS,
    );
    const parsed = itemSuggestionSchema.safeParse(raw);
    if (!parsed.success) return null;
    return { ...parsed.data, seasons: [...new Set(parsed.data.seasons)] };
  } catch {
    return null;
  }
}

export type WishSuggestion = {
  brand: string | null;
  name: string | null;
  priceCents: number | null;
  currency: string | null;
  category: ItemCategory | null;
};

/**
 * Reads a shop screenshot (US-3.6). With Apple Intelligence: brand, name, price, category.
 * Without it: OCR + a price pattern, so the price is still filled in.
 */
export async function readShopScreenshot(uri: string): Promise<WishSuggestion | null> {
  if (!HangerVision) return null;
  let lines: string[];
  try {
    lines = await HangerVision.recognizeText(uri);
  } catch {
    return null;
  }
  const fallbackPrice = findPriceInText(lines);
  const fallback: WishSuggestion = {
    brand: null,
    name: null,
    priceCents: fallbackPrice?.cents ?? null,
    currency: fallbackPrice?.currency ?? null,
    category: null,
  };
  if ((await getAIAvailability()) !== 'available') return fallback;
  try {
    const raw = await withTimeout(HangerVision.readScreenshot(lines), AI_TIMEOUT_MS);
    const category = CATEGORY.safeParse(raw.category);
    const currency = /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : fallback.currency;
    return {
      brand: raw.brand.trim() || null,
      name: raw.name.trim() || null,
      priceCents: parsePriceToCents(raw.price) ?? fallback.priceCents,
      currency,
      category: category.success ? category.data : null,
    };
  } catch {
    return fallback;
  }
}
