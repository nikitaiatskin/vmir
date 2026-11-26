import type { ItemCategory, Season } from './database';

export const CATEGORIES: readonly { value: ItemCategory; label: string }[] = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bag', label: 'Bags' },
  { value: 'accessory', label: 'Accessories' },
];

export const SEASONS: readonly { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

export const COOLOFF_OPTIONS = [7, 14, 30] as const;
export type CooloffDays = (typeof COOLOFF_OPTIONS)[number];

export const OUTFIT_TAGS = ['work', 'casual', 'party', 'sport'] as const;

export function categoryLabel(c: ItemCategory) {
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
