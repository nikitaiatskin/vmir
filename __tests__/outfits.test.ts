import { outfitsWithItem, type OutfitWithItems } from '@/api/outfits';
import {
  clampPlacement,
  moveLayer,
  newPlacement,
  normaliseTag,
  normalizeZ,
  type Placement,
} from '@/features/outfits';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/images', () => ({}));

const p = (key: string, z: number, extra: Partial<Placement> = {}): Placement => ({
  key,
  itemId: `item-${key}`,
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  z,
  ...extra,
});

describe('clampPlacement', () => {
  it('keeps values inside the canvas and allowed scale', () => {
    expect(clampPlacement(p('a', 0, { x: -1, y: 2, scale: 9, rotation: 270 }))).toMatchObject({
      x: 0,
      y: 1,
      scale: 3,
      rotation: -90,
    });
    expect(clampPlacement(p('a', 0, { scale: 0.01 })).scale).toBe(0.2);
  });
});

describe('layers', () => {
  it('new items go on top and are staggered', () => {
    const list = [p('a', 0), p('b', 5)];
    const n = newPlacement(list, 'item-c', 'c');
    expect(n.z).toBe(6);
    expect(n.x).not.toBe(0.5 - 0.12);
  });

  it('normalizeZ keeps order and makes z contiguous', () => {
    expect(normalizeZ([p('a', 10), p('b', 3), p('c', 7)]).map((x) => [x.key, x.z])).toEqual([
      ['a', 2],
      ['b', 0],
      ['c', 1],
    ]);
  });

  it('moves a layer forward and backward', () => {
    const list = [p('a', 0), p('b', 1), p('c', 2)];
    const fwd = moveLayer(list, 'a', 'forward');
    expect(fwd.find((x) => x.key === 'a')!.z).toBe(1);
    expect(fwd.find((x) => x.key === 'b')!.z).toBe(0);
    const back = moveLayer(list, 'a', 'backward');
    expect(back.find((x) => x.key === 'a')!.z).toBe(0); // already at the bottom
  });
});

describe('outfitsWithItem', () => {
  it('finds outfits containing the item (US-2.5)', () => {
    const outfits = [
      { id: 'o1', outfit_items: [{ item_id: 'x' }, { item_id: 'y' }] },
      { id: 'o2', outfit_items: [{ item_id: 'y' }] },
    ] as unknown as OutfitWithItems[];
    expect(outfitsWithItem(outfits, 'x').map((o) => o.id)).toEqual(['o1']);
    expect(outfitsWithItem(outfits, 'y').map((o) => o.id)).toEqual(['o1', 'o2']);
  });
});

it('normalises custom tags', () => {
  expect(normaliseTag('  Date Night ')).toBe('date-night');
});
