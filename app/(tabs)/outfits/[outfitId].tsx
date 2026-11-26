import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useItems } from '@/api/items';
import { useDeleteOutfit, useOutfit } from '@/api/outfits';
import { ItemImage } from '@/components/item-image';
import { WornTodayButton } from '@/components/worn-today';
import { Button, ErrorState, Loading, T } from '@/components/ui';
import { itemTitle } from '@/features/items';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';

export default function OutfitDetailScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const { colors, space, radius } = useTheme();
  const { data: outfit, isLoading, isError, refetch } = useOutfit(outfitId);
  const items = useItems();
  const del = useDeleteOutfit();
  const preview = useSignedUrls('outfit-images', [outfit?.preview_path]);

  const itemIds = new Set(outfit?.outfit_items.map((oi) => oi.item_id));
  const inOutfit = (items.data ?? []).filter((i) => itemIds.has(i.id));
  const itemUrls = useSignedUrls(
    'item-photos',
    inOutfit.map((i) => i.cutout_path ?? i.photo_path),
  );

  if (isLoading) return <Loading />;
  if (isError || !outfit) return <ErrorState onRetry={refetch} />;

  const remove = () =>
    Alert.alert('Delete this outfit?', 'Your clothes stay in the wardrobe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => del.mutate(outfit, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: space.xxxl }}
    >
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <T
              accessibilityRole="button"
              style={{ fontWeight: '600' }}
              onPress={() =>
                router.push({ pathname: '/outfits/builder', params: { outfitId: outfit.id } })
              }
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
          overflow: 'hidden',
        }}
      >
        {outfit.preview_path && preview.data?.[outfit.preview_path] ? (
          <Image
            source={{ uri: preview.data[outfit.preview_path], cacheKey: outfit.preview_path }}
            contentFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
      </View>
      <View style={{ gap: space.xs }}>
        <T variant="title">{outfit.name}</T>
        {outfit.tags.length ? <T variant="muted">{outfit.tags.join(' · ')}</T> : null}
      </View>

      <WornTodayButton itemIds={[...itemIds]} outfitId={outfit.id} />

      <View style={{ gap: space.s }}>
        <T variant="label">In this outfit</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {inOutfit.map((i) => {
            const p = i.cutout_path ?? i.photo_path;
            return (
              <Pressable
                key={i.id}
                onPress={() => router.push(`/wardrobe/${i.id}`)}
                style={{ width: 80 }}
              >
                <ItemImage url={itemUrls.data?.[p]} cacheKey={p} label={itemTitle(i)} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label="Delete outfit" kind="danger" onPress={remove} loading={del.isPending} />
    </ScrollView>
  );
}
