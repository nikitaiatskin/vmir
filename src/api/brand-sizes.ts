import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { BrandSizeRow, ItemCategory } from '@/types/database';

const key = ['brand-sizes'] as const;

export function useBrandSizes() {
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<BrandSizeRow[]> => {
      const { data, error } = await supabase.from('brand_sizes').select('*').order('brand');
      if (error) throw error;
      return data;
    },
  });
}

/** Picks the size for a brand: category-specific first, then the brand-wide size (US-3.5). */
export function findBrandSize(
  sizes: readonly Pick<BrandSizeRow, 'brand' | 'category' | 'size'>[],
  brand: string,
  category: ItemCategory | null,
): string | null {
  const b = brand.trim().toLowerCase();
  if (!b) return null;
  const forBrand = sizes.filter((s) => s.brand.trim().toLowerCase() === b);
  return (
    forBrand.find((s) => category && s.category === category)?.size ??
    forBrand.find((s) => s.category === null)?.size ??
    null
  );
}

export function useBrandSizeHint(brand: string, category: ItemCategory | null) {
  const { data } = useBrandSizes();
  const size = data ? findBrandSize(data, brand, category) : null;
  return size ? `Your ${brand.trim()} size: ${size}` : undefined;
}

export function useSaveBrandSize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { brand: string; category: ItemCategory | null; size: string }) => {
      const { error } = await supabase.from('brand_sizes').insert(v);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteBrandSize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_sizes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
