import {
  costPerWear,
  monthGrid,
  wardrobeStats,
  wearCounts,
  wearsByDay,
} from '@/features/wear-stats';

const item = (id: string, price: number | null, status: 'active' | 'archived' = 'active') => ({
  id,
  price_cents: price,
  status,
  created_at: '2026-01-01',
});

describe('costPerWear', () => {
  it('divides price by wears, at least one', () => {
    expect(costPerWear(10000, 50)).toBe(200);
    expect(costPerWear(10000, 0)).toBe(10000);
    expect(costPerWear(null, 3)).toBeNull();
  });
});

describe('wardrobeStats', () => {
  const items = [
    item('coat', 12000),
    item('tee', 1500),
    item('scarf', null),
    item('sold', 3000, 'archived'),
  ];
  const wears = [
    { item_id: 'coat', worn_on: '2026-11-01' },
    { item_id: 'coat', worn_on: '2026-11-02' },
    { item_id: 'coat', worn_on: '2026-11-03' },
    { item_id: 'tee', worn_on: '2026-11-03' },
  ];
  const s = wardrobeStats(items, wears);

  it('sums money spent including archived items', () => {
    expect(s.spentCents).toBe(16500);
  });
  it('ranks most worn and lists never worn active items', () => {
    expect(s.mostWorn.map((x) => [x.item.id, x.count])).toEqual([
      ['coat', 3],
      ['tee', 1],
    ]);
    expect(s.neverWorn.map((i) => i.id)).toEqual(['scarf']);
  });
  it('averages cost per wear over priced items', () => {
    // coat 4000, tee 1500, sold 3000 → avg 2833
    expect(s.avgCostPerWearCents).toBe(2833);
  });
  it('counts wears', () => {
    expect(wearCounts(wears).get('coat')).toBe(3);
    expect(wearsByDay(wears).get('2026-11-03')).toEqual(['coat', 'tee']);
  });
});

describe('monthGrid', () => {
  it('starts weeks on Monday', () => {
    const g = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(g[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
});
