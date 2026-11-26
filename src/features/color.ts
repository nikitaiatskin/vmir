/**
 * Colour maths for Hanger (SPEC.md §3 and §5).
 * Pure functions only: everything here is unit tested.
 */

export type RGB = [number, number, number];
type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** HSL with h in degrees [0, 360), s and l in [0, 1]. */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return [h * 60, s, l];
}

function rgbToLab([r, g, b]: RGB): Lab {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 colour difference. ~1 is barely visible, >10 is clearly different. */
export function deltaE2000(a: string, b: string): number {
  const [L1, a1, b1] = rgbToLab(hexToRgb(a));
  const [L2, a2, b2] = rgbToLab(hexToRgb(b));
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hp = (x: number, y: number) => {
    if (x === 0 && y === 0) return 0;
    const h = Math.atan2(y, x) / rad;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/**
 * Neutral colours go with everything: low saturation (greys, black, white),
 * plus beige and navy ranges (SPEC.md §5 Match check).
 */
export function isNeutral(hex: string): boolean {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.15 || l < 0.12 || l > 0.92) return true;
  const beige = h >= 25 && h <= 50 && s < 0.5 && l > 0.6;
  const navy = h >= 210 && h <= 250 && l < 0.3;
  return beige || navy;
}

/** Hue distance on the colour wheel, 0–180. */
export function hueDistance(a: string, b: string): number {
  const [ha] = rgbToHsl(hexToRgb(a));
  const [hb] = rgbToHsl(hexToRgb(b));
  const d = Math.abs(ha - hb) % 360;
  return d > 180 ? 360 - d : d;
}

/** Two colours are compatible if either is neutral, or they are analogous or complementary. */
export function colorsCompatible(a: string, b: string): boolean {
  if (isNeutral(a) || isNeutral(b)) return true;
  const d = hueDistance(a, b);
  return d < 30 || (d >= 150 && d <= 210);
}

/**
 * k-means on RGB samples ([r,g,b,r,g,b,...] from the native pixel sampler).
 * Returns up to `max` hex colours, biggest cluster first, ignoring clusters < minShare.
 * Deterministic: initial centres are spread evenly through the samples sorted by lightness.
 */
export function dominantColors(
  samples: readonly number[],
  { k = 5, max = 3, minShare = 0.08, iterations = 12 } = {},
): string[] {
  const pts: RGB[] = [];
  for (let i = 0; i + 2 < samples.length; i += 3) {
    pts.push([samples[i]!, samples[i + 1]!, samples[i + 2]!]);
  }
  if (pts.length === 0) return [];
  const sorted = [...pts].sort((p, q) => p[0] + p[1] + p[2] - (q[0] + q[1] + q[2]));
  const kk = Math.min(k, pts.length);
  let centres: RGB[] = Array.from(
    { length: kk },
    (_, i) => sorted[Math.floor(((i + 0.5) * sorted.length) / kk)]!,
  );
  let assign = new Array<number>(pts.length).fill(0);

  const dist = (p: RGB, c: RGB) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;

  for (let it = 0; it < iterations; it++) {
    assign = pts.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centres.forEach((c, ci) => {
        const d = dist(p, c);
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      return best;
    });
    centres = centres.map((c, ci) => {
      const members = pts.filter((_, pi) => assign[pi] === ci);
      if (members.length === 0) return c;
      const sum = members.reduce<RGB>(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
        [0, 0, 0],
      );
      return [sum[0] / members.length, sum[1] / members.length, sum[2] / members.length];
    });
  }

  const counts = centres.map((_, ci) => assign.filter((a) => a === ci).length);
  const clusters = centres
    .map((c, ci) => ({ hex: rgbToHex(c), share: counts[ci]! / pts.length }))
    .filter((c) => c.share >= minShare)
    .sort((a, b) => b.share - a.share);

  // Merge clusters that look the same to a person.
  const result: string[] = [];
  for (const c of clusters) {
    if (result.every((r) => deltaE2000(r, c.hex) > 8)) result.push(c.hex);
    if (result.length === max) break;
  }
  return result;
}

const NAMED: readonly [string, string][] = [
  ['black', '#111111'],
  ['white', '#F7F7F5'],
  ['grey', '#8C8C8C'],
  ['beige', '#D8C3A5'],
  ['brown', '#7B4B2A'],
  ['navy', '#1F2A44'],
  ['blue', '#2F6FD0'],
  ['light blue', '#9EC5E8'],
  ['green', '#3E8E4F'],
  ['olive', '#6B6B2E'],
  ['yellow', '#F2C94C'],
  ['orange', '#E8833A'],
  ['red', '#C62828'],
  ['burgundy', '#6D1A2B'],
  ['pink', '#EC9EC0'],
  ['purple', '#7E57C2'],
];

/** Nearest plain English colour name, used in prompts and accessibility labels. */
export function colorName(hex: string): string {
  let best = NAMED[0]!;
  let bestD = Infinity;
  for (const n of NAMED) {
    const d = deltaE2000(hex, n[1]);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best[0];
}

/** Palette for colour filter chips: one representative per named colour present in the wardrobe. */
export function paletteForFilter(colors: readonly string[]): { value: string; label: string }[] {
  const byName = new Map<string, string>();
  for (const c of colors) {
    const n = colorName(c);
    if (!byName.has(n)) byName.set(n, NAMED.find((x) => x[0] === n)![1]);
  }
  return [...byName.entries()].map(([label, value]) => ({ value, label }));
}
