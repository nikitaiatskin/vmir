import type { ItemCategory, ItemRow } from '@/types/database';

import { colorsCompatible, deltaE2000 } from './color';

/** ΔE (CIEDE2000) at or below this counts as "the same colour" (SPEC §5). */
export const SIMILAR_DELTA_E = 12;
export const MAX_SIMILAR = 6;

type Candidate = Pick<ItemRow, 'id' | 'category' | 'colors' | 'status'>;
type WishLike = { category: ItemCategory; colors: readonly string[] };

export type MatchResult<T> = {
  similar: T[];
  goesWith: T[];
  score: number;
  label: string;
};

function minDistance(a: readonly string[], b: readonly string[]) {
  let best = Infinity;
  for (const x of a) for (const y of b) best = Math.min(best, deltaE2000(x, y));
  return best;
}

export function scoreLabel(score: number) {
  if (score === 0) return "Doesn't match much yet";
  if (score <= 4) return 'Goes with a few things';
  return 'Goes with lots of your wardrobe';
}

/**
 * Match check for a wishlist item against the active wardrobe (US-3.3, US-3.4).
 * - similar: same category and at least one colour within ΔE ≤ 12, closest first, max 6
 * - goesWith: a different category with at least one compatible colour pair
 */
export function matchCheck<T extends Candidate>(
  wish: WishLike,
  items: readonly T[],
): MatchResult<T> {
  const active = items.filter((i) => i.status === 'active');

  const similar = active
    .filter((i) => i.category === wish.category && i.colors.length && wish.colors.length)
    .map((i) => ({ i, d: minDistance(wish.colors, i.colors) }))
    .filter((x) => x.d <= SIMILAR_DELTA_E)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_SIMILAR)
    .map((x) => x.i);

  // Two items of the same "slot" don't go together (two pairs of shoes); dresses replace top+bottom.
  const slot = (c: ItemCategory) => (c === 'dress' ? ['dress', 'top', 'bottom'] : [c]);
  const blocked = new Set(slot(wish.category));

  const goesWith = active.filter(
    (i) =>
      !blocked.has(i.category) &&
      !(i.category === 'dress' && (wish.category === 'top' || wish.category === 'bottom')) &&
      (wish.colors.length === 0 ||
        i.colors.length === 0 ||
        wish.colors.some((w) => i.colors.some((c) => colorsCompatible(w, c)))),
  );

  return { similar, goesWith, score: goesWith.length, label: scoreLabel(goesWith.length) };
}
