import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useItems } from '@/api/items';
import { useRemoveWears, useWears } from '@/api/wears';
import { useWishes } from '@/api/wishes';
import { ItemImage } from '@/components/item-image';
import { EmptyState, ErrorState, Loading, Section, T } from '@/components/ui';
import { moneySaved } from '@/features/cooloff';
import { itemTitle } from '@/features/items';
import { formatMoney } from '@/features/money';
import { monthGrid, wardrobeStats, wearsByDay } from '@/features/wear-stats';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import type { ItemRow } from '@/types/database';

/** Stats (US-5.3, US-5.4): money spent and saved, cost per wear, wear calendar. */
export default function StatsScreen() {
  const { colors, space, radius } = useTheme();
  const active = useItems('active');
  const archived = useItems('archived');
  const wears = useWears();
  const wishes = useWishes();
  const removeWears = useRemoveWears();
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const allItems = useMemo(
    () => [...(active.data ?? []), ...(archived.data ?? [])],
    [active.data, archived.data],
  );
  const stats = useMemo(() => wardrobeStats(allItems, wears.data ?? []), [allItems, wears.data]);
  const byDay = useMemo(() => wearsByDay(wears.data ?? []), [wears.data]);
  const itemById = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems]);
  const shown = [...stats.mostWorn.map((x) => x.item), ...stats.neverWorn.slice(0, 12)];
  const urls = useSignedUrls(
    'item-photos',
    shown.map((i) => i.cutout_path ?? i.photo_path),
  );

  if (active.isLoading || wears.isLoading || wishes.isLoading) return <Loading />;
  if (active.isError || wears.isError || wishes.isError) {
    return (
      <ErrorState
        onRetry={() => void Promise.all([active.refetch(), wears.refetch(), wishes.refetch()])}
      />
    );
  }

  if (!wears.data?.length && !allItems.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: 'Stats' }} />
        <EmptyState
          text="Log what you wear to see what's worth it."
          action="Go to wardrobe"
          onAction={() => router.navigate('/wardrobe')}
        />
      </View>
    );
  }

  const tiles: [string, string][] = [
    ['Spent', formatMoney(stats.spentCents)],
    ['Saved by waiting', formatMoney(moneySaved(wishes.data ?? []))],
    ['Avg cost per wear', formatMoney(stats.avgCostPerWearCents)],
    ['Wears logged', String(stats.totalWears)],
  ];

  const strip = (items: ItemRow[], caption: (i: ItemRow) => string) => (
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
            style={{ width: 84, gap: 4 }}
          >
            <ItemImage url={urls.data?.[p]} cacheKey={p} label={itemTitle(i)} />
            <T variant="muted" style={{ fontSize: 12 }} numberOfLines={1}>
              {caption(i)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const grid = monthGrid(month.y, month.m);
  const monthName = new Date(month.y, month.m, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const shift = (d: number) =>
    setMonth(({ y, m }) => {
      const dt = new Date(y, m + d, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });

  const openDay = (day: string) => {
    const ids = byDay.get(day) ?? [];
    if (!ids.length) return;
    const names = ids.map((id) =>
      itemById.get(id) ? itemTitle(itemById.get(id)!) : 'Deleted item',
    );
    Alert.alert(day, names.join('\n'), [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Remove these wears',
        style: 'destructive',
        onPress: () => removeWears.mutate({ itemIds: ids, date: day }),
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: space.xxxl }}
    >
      <Stack.Screen options={{ title: 'Stats' }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
        {tiles.map(([label, value]) => (
          <View
            key={label}
            style={{
              width: '47%',
              flexGrow: 1,
              padding: space.l,
              borderRadius: radius.tile,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              gap: space.xs,
            }}
          >
            <T
              variant="number"
              style={label === 'Saved by waiting' ? { color: colors.highlight } : undefined}
            >
              {value}
            </T>
            <T variant="label">{label}</T>
          </View>
        ))}
      </View>

      {stats.mostWorn.length ? (
        <Section title="Most worn">
          {strip(
            stats.mostWorn.map((x) => x.item),
            (i) => `${stats.mostWorn.find((x) => x.item.id === i.id)!.count}×`,
          )}
        </Section>
      ) : null}

      {stats.neverWorn.length ? (
        <Section title={`Never worn (${stats.neverWorn.length})`}>
          {strip(stats.neverWorn.slice(0, 12), (i) => formatMoney(i.price_cents, i.currency))}
        </Section>
      ) : null}

      <Section title="Wear calendar">
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <T accessibilityRole="button" onPress={() => shift(-1)} style={{ padding: space.s }}>
            ‹
          </T>
          <T style={{ fontWeight: '600' }}>{monthName}</T>
          <T accessibilityRole="button" onPress={() => shift(1)} style={{ padding: space.s }}>
            ›
          </T>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <T key={i} variant="muted" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>
              {d}
            </T>
          ))}
        </View>
        {grid.map((week, wi) => (
          <View key={wi} style={{ flexDirection: 'row' }}>
            {week.map((day, di) => {
              const n = day ? (byDay.get(day)?.length ?? 0) : 0;
              return (
                <Pressable
                  key={di}
                  disabled={!n}
                  onPress={() => day && openDay(day)}
                  accessibilityLabel={day ? `${day}, ${n} items worn` : undefined}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {day ? (
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: n ? colors.accent : 'transparent',
                      }}
                    >
                      <T style={{ fontSize: 13, color: n ? colors.onAccent : colors.text }}>
                        {Number(day.slice(-2))}
                      </T>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}
