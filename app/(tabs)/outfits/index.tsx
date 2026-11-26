import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';

import { useOutfits } from '@/api/outfits';
import { Fab } from '@/components/fab';
import { ItemImage } from '@/components/item-image';
import { Chips, EmptyState, ErrorState, Loading, T } from '@/components/ui';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';

/** Outfit gallery with tag filter (US-2.4). */
export default function OutfitsScreen() {
  const { colors, space } = useTheme();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, refetch, isRefetching } = useOutfits();
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      [...new Set((data ?? []).flatMap((o) => o.tags))].sort().map((t) => ({ value: t, label: t })),
    [data],
  );
  const visible = (data ?? []).filter((o) => !tag || o.tags.includes(tag));
  const urls = useSignedUrls(
    'outfit-images',
    visible.map((o) => o.preview_path),
  );
  const tile = (width - space.l * 2 - space.m) / 2;

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: 'Outfits' }} />
      {!data?.length ? (
        <EmptyState
          text="Combine your clothes into outfits."
          action="Create outfit"
          onAction={() => router.push('/outfits/builder')}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          numColumns={2}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={refetch}
          refreshing={isRefetching}
          columnWrapperStyle={{ gap: space.m, paddingHorizontal: space.l }}
          contentContainerStyle={{ gap: space.l, paddingBottom: 120 }}
          ListHeaderComponent={
            tags.length ? <Chips options={tags} value={tag} onChange={setTag} /> : undefined
          }
          ListEmptyComponent={<EmptyState text="No outfits with this tag." />}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: tile, gap: space.xs }}
              accessibilityRole="button"
              onPress={() => router.push(`/outfits/${item.id}`)}
            >
              <ItemImage
                url={item.preview_path ? urls.data?.[item.preview_path] : undefined}
                cacheKey={item.preview_path}
                padding={0}
                label={item.name}
              />
              <T numberOfLines={1} style={{ fontWeight: '600' }}>
                {item.name}
              </T>
              <T variant="muted" numberOfLines={1} style={{ fontSize: 13 }}>
                {item.outfit_items.length} items
                {item.tags.length ? ` · ${item.tags.join(', ')}` : ''}
              </T>
            </Pressable>
          )}
        />
      )}
      {data?.length ? (
        <Fab label="New outfit" onPress={() => router.push('/outfits/builder')} />
      ) : null}
    </View>
  );
}
