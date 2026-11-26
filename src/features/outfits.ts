/** Outfit canvas logic (SPEC §2 outfit_items, US-2.2). Pure and unit tested. */

export type Placement = {
  key: string;
  itemId: string;
  x: number; // centre, 0–1 of canvas width
  y: number; // centre, 0–1 of canvas height
  scale: number; // 0.2–3
  rotation: number; // degrees
  z: number;
};

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampPlacement(p: Placement): Placement {
  let r = p.rotation % 360;
  if (r > 180) r -= 360;
  if (r < -180) r += 360;
  return {
    ...p,
    x: clamp(p.x, 0, 1),
    y: clamp(p.y, 0, 1),
    scale: clamp(p.scale, MIN_SCALE, MAX_SCALE),
    rotation: r,
  };
}

/** Re-numbers z to 0..n-1 keeping order. */
export function normalizeZ(list: readonly Placement[]): Placement[] {
  const order = [...list].sort((a, b) => a.z - b.z).map((p) => p.key);
  return list.map((p) => ({ ...p, z: order.indexOf(p.key) }));
}

export function topZ(list: readonly Placement[]) {
  return list.reduce((m, p) => Math.max(m, p.z), -1) + 1;
}

/** Default position for a newly added item: centre-ish, staggered so items don't fully overlap. */
export function newPlacement(list: readonly Placement[], itemId: string, key: string): Placement {
  const n = list.length;
  return {
    key,
    itemId,
    x: 0.5 + ((n % 3) - 1) * 0.12,
    y: 0.35 + (Math.floor(n / 3) % 3) * 0.18,
    scale: 1,
    rotation: 0,
    z: topZ(list),
  };
}

export function moveLayer(list: readonly Placement[], key: string, dir: 'forward' | 'backward') {
  const sorted = [...normalizeZ(list)].sort((a, b) => a.z - b.z);
  const i = sorted.findIndex((p) => p.key === key);
  const j = dir === 'forward' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= sorted.length) return normalizeZ(list);
  const a = sorted[i]!;
  const b = sorted[j]!;
  return list.map((p) => {
    if (p.key === a.key) return { ...p, z: b.z };
    if (p.key === b.key) return { ...p, z: a.z };
    return { ...p, z: sorted.find((s) => s.key === p.key)!.z };
  });
}

export function normaliseTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);
}
