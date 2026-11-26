import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { useDeleteItem, useItem, useRetryCutout, useUpdateItem } from '@/api/items';
import { Button, ErrorState, Loading, T } from '@/components/ui';
import { colorName } from '@/features/color';
import { itemTitle } from '@/features/items';
import { formatMoney } from '@/features/money';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import { categoryLabel } from '@/types/domain';

/** Item detail (SPEC §4). Wear stats and outfits are added in later steps. */
export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { colors, space, radius } = useTheme();
  const { data: item, isLoading, isError, refetch } = useItem(itemId);
  const update = useUpdateItem();
  const del = useDeleteItem();
  const retry = useRetryCutout();
  const path = item ? (item.cutout_path ?? item.photo_path) : null;
  const urls = useSignedUrls('item-photos', [path]);

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
                style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c, borderWidth: 1, borderColor: colors.border }}
              />
            ))}
            <T variant="muted">{item.colors.map(colorName).join(', ')}</T>
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.m }}>
        {facts.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="muted">{k}</T>
            <T>{v}</T>
          </View>
        ))}
      </View>

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
