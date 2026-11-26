import type { ItemRow, WearRow } from '@/types/database';

type Item = Pick<ItemRow, 'id' | 'price_cents' | 'status' | 'created_at'>;
type Wear = Pick<WearRow, 'item_id' | 'worn_on'>;

export function wearCounts(wears: readonly Wear[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of wears) m.set(w.item_id, (m.get(w.item_id) ?? 0) + 1);
  return m;
}

/** costPerWear = price / max(wearCount, 1); null when there is no price (SPEC §5). */
export function costPerWear(priceCents: number | null, wearCount: number): number | null {
  if (priceCents == null) return null;
  return Math.round(priceCents / Math.max(wearCount, 1));
}

export type WardrobeStats<T> = {
  spentCents: number;
  itemCount: number;
  totalWears: number;
  avgCostPerWearCents: number | null;
  mostWorn: { item: T; count: number }[];
  neverWorn: T[];
};

/** Stats screen numbers (US-5.4). Archived items count for money spent but not for "never worn". */
export function wardrobeStats<T extends Item>(
  items: readonly T[],
  wears: readonly Wear[],
): WardrobeStats<T> {
  const counts = wearCounts(wears);
  const spentCents = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const priced = items.filter((i) => i.price_cents != null);
  const cpws = priced.map((i) => costPerWear(i.price_cents, counts.get(i.id) ?? 0)!);
  const active = items.filter((i) => i.status === 'active');

  return {
    spentCents,
    itemCount: active.length,
    totalWears: wears.length,
    avgCostPerWearCents: cpws.length
      ? Math.round(cpws.reduce((a, b) => a + b, 0) / cpws.length)
      : null,
    mostWorn: active
      .map((item) => ({ item, count: counts.get(item.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    neverWorn: active.filter((i) => !counts.has(i.id)),
  };
}

/** Month grid for the wear calendar: weeks starting Monday, `null` for padding days. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function wearsByDay(wears: readonly Wear[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const w of wears) m.set(w.worn_on, [...(m.get(w.worn_on) ?? []), w.item_id]);
  return m;
}
