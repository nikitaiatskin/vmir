import { router, Stack } from 'expo-router';
import { Pressable, SectionList, View } from 'react-native';

import { useWishes } from '@/api/wishes';
import { Fab } from '@/components/fab';
import { ItemImage } from '@/components/item-image';
import { EmptyState, ErrorState, Loading, T } from '@/components/ui';
import { countdownLabel, isDue, moneySaved } from '@/features/cooloff';
import { formatMoney } from '@/features/money';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import type { WishRow } from '@/types/database';
import { categoryLabel } from '@/types/domain';

/** Wishlist: "Decide now", "Waiting" with countdown, and history (SPEC §4). */
export default function WishlistScreen() {
  const { colors, space, radius } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useWishes();
  const urls = useSignedUrls(
    'item-photos',
    (data ?? []).map((w) => w.cutout_path ?? w.photo_path),
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const open = (data ?? []).filter((w) => !w.decision);
  const sections = [
    { title: 'Decide now', data: open.filter((w) => isDue(w.decide_at)) },
    { title: 'Waiting', data: open.filter((w) => !isDue(w.decide_at)) },
    {
      title: 'History',
      data: (data ?? [])
        .filter((w) => w.decision)
        .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? '')),
    },
  ].filter((s) => s.data.length);
  const saved = moneySaved(data ?? []);

  const row = (w: WishRow) => {
    const path = w.cutout_path ?? w.photo_path;
    const due = !w.decision && isDue(w.decide_at);
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/wishlist/${w.id}`)}
        style={{
          flexDirection: 'row',
          gap: space.m,
          alignItems: 'center',
          paddingHorizontal: space.l,
          paddingVertical: space.s,
          opacity: w.decision === 'skipped' ? 0.6 : 1,
        }}
      >
        <ItemImage
          url={path ? urls.data?.[path] : undefined}
          cacheKey={path}
          style={{ width: 64 }}
          pending={false}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <T numberOfLines={1} style={{ fontWeight: '600' }}>
            {w.name ?? categoryLabel(w.category)}
          </T>
          <T variant="muted" numberOfLines={1} style={{ fontSize: 14 }}>
            {[w.brand, formatMoney(w.price_cents, w.currency)].filter(Boolean).join(' · ')}
          </T>
        </View>
        {w.decision ? (
          <T
            style={{
              color: w.decision === 'bought' ? colors.success : colors.textMuted,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {w.decision === 'bought' ? 'Bought' : 'Skipped'}
          </T>
        ) : (
          <View
            style={{
              paddingHorizontal: space.s,
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: due ? colors.highlight : 'transparent',
              borderWidth: due ? 0 : 1,
              borderColor: colors.highlight,
            }}
          >
            <T
              style={{
                color: due ? colors.onAccent : colors.highlight,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {countdownLabel(w.decide_at)}
            </T>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: 'Wishlist' }} />
      {!data?.length ? (
        <EmptyState
          text="Want something? Park it here and decide later."
          action="Add to wishlist"
          onAction={() => router.push('/add-wish')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(w) => w.id}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            saved > 0 ? (
              <View style={{ paddingHorizontal: space.l, paddingBottom: space.m }}>
                <T style={{ color: colors.highlight, fontWeight: '600' }}>
                  You saved {formatMoney(saved)} by waiting.
                </T>
              </View>
            ) : undefined
          }
          renderSectionHeader={({ section }) => (
            <T
              variant="label"
              style={{ paddingHorizontal: space.l, paddingTop: space.l, paddingBottom: space.s }}
            >
              {section.title}
            </T>
          )}
          renderItem={({ item }) => row(item)}
        />
      )}
      {data?.length ? (
        <Fab label="Add to wishlist" onPress={() => router.push('/add-wish')} />
      ) : null}
    </View>
  );
}
