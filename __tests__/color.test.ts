import {
  colorName,
  colorsCompatible,
  deltaE2000,
  dominantColors,
  hexToRgb,
  isNeutral,
  rgbToHex,
} from '@/features/color';

const samplesOf = (...groups: [string, number][]) =>
  groups.flatMap(([hex, n]) => Array.from({ length: n }, () => hexToRgb(hex)).flat());

describe('hex conversion', () => {
  it('round-trips', () => {
    expect(rgbToHex(hexToRgb('#1f2a44'))).toBe('#1F2A44');
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
});

describe('deltaE2000', () => {
  it('is zero for identical colours and small for near-identical ones', () => {
    expect(deltaE2000('#0000FF', '#0000FF')).toBe(0);
    expect(deltaE2000('#0000FF', '#0505FF')).toBeLessThan(3);
  });
  it('is large for clearly different colours', () => {
    expect(deltaE2000('#C62828', '#2F6FD0')).toBeGreaterThan(40);
  });
  it('is symmetric', () => {
    expect(deltaE2000('#D8C3A5', '#7B4B2A')).toBeCloseTo(deltaE2000('#7B4B2A', '#D8C3A5'), 6);
  });
});

describe('neutrals and compatibility', () => {
  it.each(['#111111', '#FFFFFF', '#8C8C8C', '#D8C3A5', '#1F2A44'])('%s is neutral', (c) => {
    expect(isNeutral(c)).toBe(true);
  });
  it.each(['#C62828', '#2F6FD0', '#3E8E4F'])('%s is not neutral', (c) => {
    expect(isNeutral(c)).toBe(false);
  });
  it('neutral goes with anything', () => {
    expect(colorsCompatible('#111111', '#C62828')).toBe(true);
  });
  it('analogous and complementary colours are compatible', () => {
    expect(colorsCompatible('#C62828', '#E8833A')).toBe(true); // red → orange, analogous
    expect(colorsCompatible('#2F6FD0', '#E8833A')).toBe(true); // blue ↔ orange
  });
  it('clashing colours are not compatible', () => {
    expect(colorsCompatible('#3E8E4F', '#7E57C2')).toBe(false); // green vs purple (~130°)
  });
});

describe('dominantColors', () => {
  it('returns the biggest clusters first', () => {
    const out = dominantColors(samplesOf(['#1F2A44', 600], ['#F7F7F5', 300], ['#C62828', 100]));
    expect(out).toHaveLength(3);
    expect(colorName(out[0]!)).toBe('navy');
    expect(colorName(out[1]!)).toBe('white');
    expect(colorName(out[2]!)).toBe('red');
  });
  it('ignores clusters under 8 %', () => {
    const out = dominantColors(samplesOf(['#111111', 950], ['#C62828', 50]));
    expect(out.map(colorName)).toEqual(['black']);
  });
  it('handles no samples', () => {
    expect(dominantColors([])).toEqual([]);
  });
});
