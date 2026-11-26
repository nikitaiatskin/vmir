import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, View, useWindowDimensions } from 'react-native';

import { useItems } from '@/api/items';
import { Fab } from '@/components/fab';
import { ItemImage } from '@/components/item-image';
import { Chips, EmptyState, ErrorState, Loading } from '@/components/ui';
import { paletteForFilter } from '@/features/color';
import { filterItems, itemTitle, type ItemFilter } from '@/features/items';
import { useSignedUrls } from '@/lib/images';
import { startAddItem } from '@/lib/pick-photos';
import { useTheme } from '@/theme';
import type { ItemCategory, Season } from '@/types/database';
import { CATEGORIES, SEASONS } from '@/types/domain';

function openAddMenu() {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['Take photo', 'Choose from library', 'Cancel'], cancelButtonIndex: 2 },
    (i) => {
      if (i === 0) void startAddItem('camera');
      if (i === 1) void startAddItem('library');
    },
  );
}

/** Wardrobe grid with filters (US-1.6). */
export default function WardrobeScreen() {
  const { colors, space } = useTheme();
  const { width } = useWindowDimensions();
  const { data: items, isLoading, isError, refetch, isRefetching } = useItems();
  const [filter, setFilter] = useState<ItemFilter>({ category: null, color: null, season: null });

  const visible = useMemo(() => filterItems(items ?? [], filter), [items, filter]);
  const palette = useMemo(() => paletteForFilter((items ?? []).flatMap((i) => i.colors)), [items]);
  const urls = useSignedUrls(
    'item-photos',
    visible.map((i) => i.cutout_path ?? i.photo_path),
  );

  const gap = space.s;
  const tile = (width - space.l * 2 - gap * 2) / 3;

  const header = (
    <Stack.Screen
      options={{
        title: 'Wardrobe',
        headerRight: () => (
          <Pressable
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            hitSlop={12}
          >
            <SymbolView name="gearshape" tintColor={colors.text} size={22} />
          </Pressable>
        ),
      }}
    />
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;

  if (!items?.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        {header}
        <EmptyState
          text="Your wardrobe is empty. Start with the 5 things you wear most."
          action="Add first item"
          onAction={openAddMenu}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        numColumns={3}
        contentInsetAdjustmentBehavior="automatic"
        onRefresh={refetch}
        refreshing={isRefetching}
        columnWrapperStyle={{ gap, paddingHorizontal: space.l }}
        contentContainerStyle={{ gap, paddingBottom: 120 }}
        initialNumToRender={18}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: space.s, marginBottom: space.s, marginHorizontal: -space.l }}>
            <View style={{ marginHorizontal: space.l }}>
              <Chips<ItemCategory>
                options={CATEGORIES}
                value={filter.category}
                onChange={(category) => setFilter((f) => ({ ...f, category }))}
              />
            </View>
            {palette.length > 1 ? (
              <View style={{ marginHorizontal: space.l }}>
                <Chips
                  options={palette}
                  value={filter.color}
                  colorDots
                  onChange={(color) => setFilter((f) => ({ ...f, color }))}
                />
              </View>
            ) : null}
            <View style={{ marginHorizontal: space.l }}>
              <Chips<Season>
                options={SEASONS}
                value={filter.season}
                onChange={(season) => setFilter((f) => ({ ...f, season }))}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState text="Nothing matches these filters." />}
        renderItem={({ item }) => {
          const path = item.cutout_path ?? item.photo_path;
          return (
            <Pressable
              onPress={() => router.push(`/wardrobe/${item.id}`)}
              style={{ width: tile }}
              accessibilityRole="button"
            >
              <ItemImage
                url={urls.data?.[path]}
                cacheKey={path}
                label={itemTitle(item)}
                padding={item.cutout_path ? 0.1 : 0}
              />
            </Pressable>
          );
        }}
      />
      <Fab label="Add item" onPress={openAddMenu} />
    </View>
  );
}
