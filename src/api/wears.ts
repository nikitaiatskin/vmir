import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { WearRow } from '@/types/database';

export const wearKeys = { all: ['wears'] as const };

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening wears land on the right day). */
export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useWears() {
  return useQuery({
    queryKey: wearKeys.all,
    queryFn: async (): Promise<WearRow[]> => {
      const { data, error } = await supabase
        .from('wears')
        .select('*')
        .order('worn_on', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });
}

/** "Worn today" for one item or all items of an outfit (US-5.1). Idempotent per day. */
export function useLogWear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { itemIds: string[]; outfitId?: string; date?: string }) => {
      const worn_on = v.date ?? todayISO();
      const { error } = await supabase.from('wears').upsert(
        v.itemIds.map((item_id) => ({ item_id, worn_on, outfit_id: v.outfitId ?? null })),
        { onConflict: 'item_id,worn_on', ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: wearKeys.all }),
  });
}

export function useRemoveWears() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { itemIds: string[]; date: string }) => {
      const { error } = await supabase
        .from('wears')
        .delete()
        .in('item_id', v.itemIds)
        .eq('worn_on', v.date);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: wearKeys.all }),
  });
}
