import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelCooloffReminder, scheduleCooloffReminder } from '@/lib/notifications';
import { removeImages } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Database, WishRow } from '@/types/database';

import { itemKeys } from './items';

type WishInsert = Database['public']['Tables']['wishes']['Insert'];

export const wishKeys = {
  all: ['wishes'] as const,
  list: () => ['wishes', 'list'] as const,
  one: (id: string) => ['wishes', 'one', id] as const,
};

export function useWishes() {
  return useQuery({
    queryKey: wishKeys.list(),
    queryFn: async (): Promise<WishRow[]> => {
      const { data, error } = await supabase
        .from('wishes')
        .select('*')
        .order('decide_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useWish(id: string | undefined) {
  return useQuery({
    queryKey: wishKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<WishRow> => {
      const { data, error } = await supabase.from('wishes').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: WishInsert) => {
      const { data, error } = await supabase.from('wishes').insert(values).select().single();
      if (error) throw error;
      await scheduleCooloffReminder(data).catch(() => undefined);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: wishKeys.all }),
  });
}

/**
 * Bought → creates a wardrobe item from the wish (US-4.3); Skipped → counts as saved (US-4.4).
 * The item reuses the wish's photos, so storage files are shared.
 */
export function useDecideWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ wish, decision }: { wish: WishRow; decision: 'bought' | 'skipped' }) => {
      if (decision === 'bought') {
        if (!wish.photo_path) throw new Error('A bought item needs a photo');
        const { error } = await supabase.from('items').insert({
          category: wish.category,
          name: wish.name,
          brand: wish.brand,
          price_cents: wish.price_cents,
          currency: wish.currency,
          photo_path: wish.photo_path,
          cutout_path: wish.cutout_path,
          colors: wish.colors,
          processing_status: wish.processing_status,
          purchased_at: new Date().toISOString().slice(0, 10),
          source_wish_id: wish.id,
        });
        if (error) throw error;
      }
      const { error } = await supabase
        .from('wishes')
        .update({ decision, decided_at: new Date().toISOString() })
        .eq('id', wish.id);
      if (error) throw error;
      await cancelCooloffReminder(wish.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wishKeys.all });
      qc.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useDeleteWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wish: WishRow) => {
      const { error } = await supabase.from('wishes').delete().eq('id', wish.id);
      if (error) throw error;
      await cancelCooloffReminder(wish.id);
      // Photos of a bought wish now belong to the wardrobe item.
      if (wish.decision !== 'bought') {
        await removeImages('item-photos', [wish.photo_path, wish.cutout_path]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: wishKeys.all }),
  });
}
