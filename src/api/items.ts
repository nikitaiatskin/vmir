import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { extractColors, removeBackground } from '@/features/vision';
import { downloadToCache, newImagePath, removeImages, uploadImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Database, ItemRow } from '@/types/database';

type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

export const itemKeys = {
  all: ['items'] as const,
  list: (status: 'active' | 'archived') => ['items', 'list', status] as const,
  one: (id: string) => ['items', 'one', id] as const,
};

export function useItems(status: 'active' | 'archived' = 'active') {
  return useQuery({
    queryKey: itemKeys.list(status),
    queryFn: async (): Promise<ItemRow[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: itemKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ItemRow> => {
      const { data, error } = await supabase.from('items').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export async function insertItem(values: ItemInsert): Promise<ItemRow> {
  const { data, error } = await supabase.from('items').insert(values).select().single();
  if (error) throw error;
  return data;
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: insertItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ItemUpdate }) => {
      const { data, error } = await supabase
        .from('items')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ItemRow) => {
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) throw error;
      // Photos of an item bought from the wishlist are still shown in the wishlist history.
      if (!item.source_wish_id) {
        await removeImages('item-photos', [item.photo_path, item.cutout_path]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all });
      qc.invalidateQueries({ queryKey: ['outfits'] });
      qc.invalidateQueries({ queryKey: ['wears'] });
    },
  });
}

/** "Retry" for items whose background removal failed (SPEC §3 step 2). */
export function useRetryCutout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ItemRow) => {
      const local = await downloadToCache('item-photos', item.photo_path);
      const cutout = await removeBackground(local);
      if (!cutout) throw new Error('No subject found');
      const path = newImagePath(item.user_id, 'png', 'cutout-');
      await uploadImage('item-photos', path, cutout);
      const colors = item.colors_edited ? item.colors : await extractColors(cutout);
      const { error } = await supabase
        .from('items')
        .update({ cutout_path: path, processing_status: 'done', colors })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}
