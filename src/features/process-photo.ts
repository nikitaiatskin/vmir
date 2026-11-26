import { prepareForUpload } from '@/lib/images';

import { extractColors, removeBackground, suggestItem, type ItemSuggestion } from './vision';

export type ProcessedPhoto = {
  photoUri: string;
  cutoutUri: string | null;
  colors: string[];
};

/**
 * On-device add-item pipeline (SPEC §3): resize → background removal → colours.
 * Never throws for Vision problems: a failed cutout keeps the original photo.
 */
export async function processPhoto(uri: string, width?: number, height?: number) {
  const photoUri = await prepareForUpload(uri, width, height);
  const cutoutUri = await removeBackground(photoUri);
  const colors = await extractColors(cutoutUri ?? photoUri);
  return { photoUri, cutoutUri, colors } satisfies ProcessedPhoto;
}

/** Apple Intelligence step, run after processPhoto so the form is usable immediately. */
export function suggestFor(p: ProcessedPhoto): Promise<ItemSuggestion | null> {
  return suggestItem(p.cutoutUri ?? p.photoUri, p.colors);
}
