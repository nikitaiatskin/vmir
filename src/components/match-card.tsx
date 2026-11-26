import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import type { MatchResult } from '@/features/match';
import { itemTitle } from '@/features/items';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import type { ItemRow } from '@/types/database';

import { ItemImage } from './item-image';
import { T } from './ui';

/** Match check card on the wish detail (DESIGN.md §5 MatchCard). */
export function MatchCard({ result }: { result: MatchResult<ItemRow> }) {
  const { colors, space, radius } = useTheme();
  const all = [...result.similar, ...result.goesWith];
  const urls = useSignedUrls(
    'item-photos',
    all.map((i) => i.cutout_path ?? i.photo_path),
  );

  const strip = (items: ItemRow[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.s }}
    >
      {items.map((i) => {
        const p = i.cutout_path ?? i.photo_path;
        return (
          <Pressable
            key={i.id}
            onPress={() => router.push(`/wardrobe/${i.id}`)}
            style={{ width: 72 }}
          >
            <ItemImage url={urls.data?.[p]} cacheKey={p} label={itemTitle(i)} />
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View
      style={{
        gap: space.m,
        padding: space.l,
        borderRadius: radius.tile,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <T variant="label">Match check</T>
      {result.similar.length ? (
        <View style={{ gap: space.s }}>
          <T style={{ color: colors.warning, fontWeight: '600' }}>
            ⚠ You already own something similar
          </T>
          {strip(result.similar)}
        </View>
      ) : (
        <T variant="muted">Nothing similar in your wardrobe.</T>
      )}
      <View style={{ gap: space.s }}>
        <T style={{ fontWeight: '600' }}>
          {result.label}
          {result.score ? ` (${result.score})` : ''}
        </T>
        {result.goesWith.length ? strip(result.goesWith.slice(0, 12)) : null}
      </View>
    </View>
  );
}
