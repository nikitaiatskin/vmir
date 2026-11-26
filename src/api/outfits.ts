import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Placement } from '@/features/outfits';
import { newImagePath, removeImages, uploadImage } from '@/lib/images';
import { requireUserId, supabase } from '@/lib/supabase';
import type { OutfitItemRow, OutfitRow } from '@/types/database';

export type OutfitWithItems = OutfitRow & { outfit_items: OutfitItemRow[] };

export const outfitKeys = {
  all: ['outfits'] as const,
  list: () => ['outfits', 'list'] as const,
  one: (id: string) => ['outfits', 'one', id] as const,
};

export function useOutfits() {
  return useQuery({
    queryKey: outfitKeys.list(),
    queryFn: async (): Promise<OutfitWithItems[]> => {
      const { data, error } = await supabase
        .from('outfits')
        .select('*, outfit_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useOutfit(id: string | undefined) {
  return useQuery({
    queryKey: outfitKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<OutfitWithItems> => {
      const { data, error } = await supabase
        .from('outfits')
        .select('*, outfit_items(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Outfits that contain the item (US-2.5). */
export function outfitsWithItem(outfits: readonly OutfitWithItems[], itemId: string) {
  return outfits.filter((o) => o.outfit_items.some((oi) => oi.item_id === itemId));
}

type SaveInput = {
  id?: string;
  name: string;
  tags: string[];
  placements: Placement[];
  previewUri: string;
  oldPreviewPath?: string | null;
};

export function useSaveOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveInput) => {
      const userId = await requireUserId();
      const previewPath = await uploadImage(
        'outfit-images',
        newImagePath(userId, 'png', 'outfit-'),
        input.previewUri,
      );
      let outfitId = input.id;
      if (outfitId) {
        const { error } = await supabase
          .from('outfits')
          .update({ name: input.name, tags: input.tags, preview_path: previewPath })
          .eq('id', outfitId);
        if (error) throw error;
        const del = await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
        if (del.error) throw del.error;
      } else {
        const { data, error } = await supabase
          .from('outfits')
          .insert({ name: input.name, tags: input.tags, preview_path: previewPath })
          .select()
          .single();
        if (error) throw error;
        outfitId = data.id;
      }
      if (input.placements.length) {
        const { error } = await supabase.from('outfit_items').insert(
          input.placements.map((p) => ({
            outfit_id: outfitId!,
            item_id: p.itemId,
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotation: p.rotation,
            z_index: p.z,
          })),
        );
        if (error) throw error;
      }
      if (input.oldPreviewPath) await removeImages('outfit-images', [input.oldPreviewPath]);
      return outfitId!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outfitKeys.all }),
  });
}

export function useDeleteOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (outfit: OutfitRow) => {
      const { error } = await supabase.from('outfits').delete().eq('id', outfit.id);
      if (error) throw error;
      await removeImages('outfit-images', [outfit.preview_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outfitKeys.all }),
  });
}
