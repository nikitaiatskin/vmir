import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';

export type Bucket = 'item-photos' | 'outfit-images';

const MAX_SIDE = 1600;

/** Resizes to max 1600 px on the long side, JPEG quality 0.8 (SPEC §5 Images). */
export async function prepareForUpload(uri: string, width?: number, height?: number) {
  const ctx = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > MAX_SIDE) {
    ctx.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  } else if (!width || !height) {
    ctx.resize({ width: MAX_SIDE });
  }
  const ref = await ctx.renderAsync();
  const result = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}

export function newImagePath(userId: string, ext: 'jpg' | 'png', prefix = '') {
  return `${userId}/${prefix}${randomUUID()}.${ext}`;
}

export async function uploadImage(bucket: Bucket, path: string, localUri: string) {
  const body = await new File(localUri).arrayBuffer();
  const contentType = path.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeImages(bucket: Bucket, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  await supabase.storage.from(bucket).remove(list);
}

const SIGNED_URL_TTL = 60 * 60; // 1 hour

/**
 * Signed URLs for private images, batched per screen.
 * Pass the storage path as expo-image `cacheKey` so images stay cached when the token changes.
 */
export function useSignedUrls(bucket: Bucket, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))].sort();
  return useQuery({
    queryKey: ['signed-urls', bucket, unique],
    enabled: unique.length > 0,
    staleTime: (SIGNED_URL_TTL - 300) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(unique, SIGNED_URL_TTL);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const d of data) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      return map;
    },
  });
}

/** Downloads a private image to the cache so on-device Vision can process it again. */
export async function downloadToCache(bucket: Bucket, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data) throw error ?? new Error('No signed URL');
  const target = new File(Paths.cache, `${randomUUID()}.${path.split('.').pop() ?? 'jpg'}`);
  const file = await File.downloadFileAsync(data.signedUrl, target);
  return file.uri;
}
