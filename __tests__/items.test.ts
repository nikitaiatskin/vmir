import { findBrandSize } from '@/api/brand-sizes';
import { emptyItemForm, filterItems, formToColumns, itemTitle } from '@/features/items';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('formToColumns', () => {
  it('requires a category', () => {
    const r = formToColumns(emptyItemForm);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.category).toBe('Choose a category');
  });

  it('maps a valid draft to columns', () => {
    const r = formToColumns({
      ...emptyItemForm,
      category: 'top',
      name: ' White linen shirt ',
      price: '49,90',
      purchasedAt: '2026-11-01',
      colors: ['#f7f7f5'],
    });
    expect(r).toEqual({
      ok: true,
      columns: expect.objectContaining({
        category: 'top',
        name: 'White linen shirt',
        brand: null,
        price_cents: 4990,
        purchased_at: '2026-11-01',
        colors: ['#F7F7F5'],
      }),
    });
  });

  it('rejects a bad date and price', () => {
    const r = formToColumns({ ...emptyItemForm, category: 'top', price: 'abc', purchasedAt: '1.1.2026' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.price).toBeDefined();
      expect(r.errors.purchasedAt).toBeDefined();
    }
  });
});

describe('filterItems', () => {
  const items = [
    { id: '1', category: 'top' as const, colors: ['#1F2A44'], seasons: ['winter' as const] },
    { id: '2', category: 'top' as const, colors: ['#F7F7F5'], seasons: [] },
    { id: '3', category: 'shoes' as const, colors: ['#111111'], seasons: ['summer' as const] },
  ];
  it('filters by category', () => {
    expect(filterItems(items, { category: 'top', color: null, season: null }).map((i) => i.id)).toEqual(['1', '2']);
  });
  it('filters by colour name, not exact hex', () => {
    expect(filterItems(items, { category: null, color: '#202B46', season: null }).map((i) => i.id)).toEqual(['1']);
  });
  it('items without seasons count as all-year', () => {
    expect(filterItems(items, { category: null, color: null, season: 'winter' }).map((i) => i.id)).toEqual(['1', '2']);
  });
});

describe('itemTitle', () => {
  it('prefers the name, then brand + category', () => {
    expect(itemTitle({ name: 'Linen shirt', brand: 'COS', category: 'top' })).toBe('Linen shirt');
    expect(itemTitle({ name: null, brand: 'COS', category: 'top' })).toBe('COS top');
    expect(itemTitle({ name: null, brand: null, category: 'shoes' })).toBe('Shoes');
  });
});

describe('findBrandSize', () => {
  const sizes = [
    { brand: 'Zara', category: null, size: 'M' },
    { brand: 'Zara', category: 'shoes' as const, size: '39' },
    { brand: "Levi's", category: 'bottom' as const, size: 'W30 L32' },
  ];
  it('prefers a category-specific size', () => {
    expect(findBrandSize(sizes, 'zara', 'shoes')).toBe('39');
    expect(findBrandSize(sizes, ' Zara ', 'top')).toBe('M');
  });
  it('returns null for unknown brands', () => {
    expect(findBrandSize(sizes, 'COS', 'top')).toBeNull();
    expect(findBrandSize(sizes, "Levi's", 'top')).toBeNull();
  });
});
