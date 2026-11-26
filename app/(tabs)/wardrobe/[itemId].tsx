import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useDeleteItem, useItem, useRetryCutout, useUpdateItem } from '@/api/items';
import { outfitsWithItem, useOutfits } from '@/api/outfits';
import { useWears } from '@/api/wears';
import { ItemImage } from '@/components/item-image';
import { WornTodayButton } from '@/components/worn-today';
import { costPerWear } from '@/features/wear-stats';
import { Button, ErrorState, Loading, T } from '@/components/ui';
import { colorName } from '@/features/color';
import { itemTitle } from '@/features/items';
import { formatMoney } from '@/features/money';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import { categoryLabel } from '@/types/domain';

/** Item detail (SPEC §4): wears, cost per wear (US-5.2), outfits with this item (US-2.5). */
export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { colors, space, radius } = useTheme();
  const { data: item, isLoading, isError, refetch } = useItem(itemId);
  const update = useUpdateItem();
  const del = useDeleteItem();
  const retry = useRetryCutout();
  const path = item ? (item.cutout_path ?? item.photo_path) : null;
  const urls = useSignedUrls('item-photos', [path]);
  const wears = useWears();
  const outfits = useOutfits();
  const withItem = item ? outfitsWithItem(outfits.data ?? [], item.id) : [];
  const previews = useSignedUrls(
    'outfit-images',
    withItem.map((o) => o.preview_path),
  );

  if (isLoading) return <Loading />;
  if (isError || !item) return <ErrorState onRetry={refetch} />;

  const archive = () =>
    update.mutate(
      { id: item.id, values: { status: item.status === 'active' ? 'archived' : 'active' } },
      { onSuccess: () => router.back() },
    );

  const remove = () =>
    Alert.alert('Delete this item?', 'It will also be removed from your outfits and stats.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => del.mutate(item, { onSuccess: () => router.back() }),
      },
    ]);

  const wearCount = (wears.data ?? []).filter((w) => w.item_id === item.id).length;
  const lastWorn = (wears.data ?? []).find((w) => w.item_id === item.id)?.worn_on;

  const facts: [string, string][] = [
    ['Category', categoryLabel(item.category)],
    ['Brand', item.brand ?? '—'],
    ['Size', item.size ?? '—'],
    ['Price', formatMoney(item.price_cents, item.currency)],
    ['Bought', item.purchased_at ?? '—'],
    ['Seasons', item.seasons.length ? item.seasons.join(', ') : 'All year'],
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: space.xxxl }}
    >
      <Stack.Screen
        options={{
          title: '',
          headerLargeTitle: false,
          headerRight: () => (
            <T
              onPress={() => router.push(`/edit-item/${item.id}`)}
              accessibilityRole="button"
              style={{ fontWeight: '600' }}
            >
              Edit
            </T>
          ),
        }}
      />
      <View
        style={{
          aspectRatio: 1,
          borderRadius: radius.tile,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {path && urls.data?.[path] ? (
          <Image
            source={{ uri: urls.data[path], cacheKey: path }}
            contentFit="contain"
            style={{ width: '82%', height: '82%' }}
          />
        ) : null}
      </View>
      <View style={{ gap: space.s }}>
        <T variant="title">{itemTitle(item)}</T>
        {item.status === 'archived' ? <T variant="muted">Archived</T> : null}
        {item.colors.length ? (
          <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
            {item.colors.map((c) => (
              <View
                key={c}
                accessibilityLabel={colorName(c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: c,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            ))}
            <T variant="muted">{item.colors.map(colorName).join(', ')}</T>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space.m }}>
        {[
          [String(wearCount), wearCount === 1 ? 'Wear' : 'Wears'],
          [formatMoney(costPerWear(item.price_cents, wearCount), item.currency), 'Cost per wear'],
        ].map(([value, label]) => (
          <View
            key={label}
            style={{
              flex: 1,
              padding: space.l,
              borderRadius: radius.tile,
              borderWidth: 1,
              borderColor: colors.border,
              gap: space.xs,
            }}
          >
            <T variant="number">{value}</T>
            <T variant="label">{label}</T>
          </View>
        ))}
      </View>
      {lastWorn ? <T variant="muted">Last worn {lastWorn}</T> : null}
      {item.status === 'active' ? <WornTodayButton itemIds={[item.id]} /> : null}

      <View style={{ gap: space.m }}>
        {facts.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="muted">{k}</T>
            <T>{v}</T>
          </View>
        ))}
      </View>

      {withItem.length ? (
        <View style={{ gap: space.s }}>
          <T variant="label">
            In {withItem.length} {withItem.length === 1 ? 'outfit' : 'outfits'}
          </T>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.s }}
          >
            {withItem.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/outfits/${o.id}`)}
                style={{ width: 96 }}
              >
                <ItemImage
                  url={o.preview_path ? previews.data?.[o.preview_path] : undefined}
                  cacheKey={o.preview_path}
                  padding={0}
                  label={o.name}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {item.processing_status === 'failed' ? (
        <Button
          label={retry.isError ? 'Still no luck — try a clearer photo' : 'Retry background removal'}
          kind="secondary"
          loading={retry.isPending}
          onPress={() => retry.mutate(item)}
        />
      ) : null}

      <View style={{ gap: space.m }}>
        <Button
          label={item.status === 'active' ? 'Archive (sold / donated)' : 'Move back to wardrobe'}
          kind="secondary"
          onPress={archive}
          loading={update.isPending}
        />
        <Button label="Delete" kind="danger" onPress={remove} loading={del.isPending} />
      </View>
    </ScrollView>
  );
}
