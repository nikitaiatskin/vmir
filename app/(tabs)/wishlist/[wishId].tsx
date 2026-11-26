import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { useBrandSizeHint } from '@/api/brand-sizes';
import { useItems } from '@/api/items';
import { useDecideWish, useDeleteWish, useWish } from '@/api/wishes';
import { MatchCard } from '@/components/match-card';
import { Button, ErrorState, Loading, T } from '@/components/ui';
import { countdownLabel, isDue } from '@/features/cooloff';
import { matchCheck } from '@/features/match';
import { formatMoney } from '@/features/money';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import { categoryLabel } from '@/types/domain';

export default function WishDetailScreen() {
  const { wishId } = useLocalSearchParams<{ wishId: string }>();
  const { colors, space, radius } = useTheme();
  const { data: wish, isLoading, isError, refetch } = useWish(wishId);
  const items = useItems();
  const decide = useDecideWish();
  const del = useDeleteWish();
  const [early, setEarly] = useState(false);
  const path = wish ? (wish.cutout_path ?? wish.photo_path) : null;
  const urls = useSignedUrls('item-photos', [path]);
  const sizeHint = useBrandSizeHint(wish?.brand ?? '', wish?.category ?? null);

  if (isLoading) return <Loading />;
  if (isError || !wish) return <ErrorState onRetry={refetch} />;

  const due = isDue(wish.decide_at);
  const result = matchCheck(wish, items.data ?? []);

  const choose = (decision: 'bought' | 'skipped') => {
    if (decision === 'bought' && !wish.photo_path) {
      return Alert.alert(
        'Add a photo first',
        'Bought items go to your wardrobe, which needs a photo.',
      );
    }
    decide.mutate(
      { wish, decision },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (decision === 'skipped' && wish.price_cents) {
            Alert.alert('Nice!', `You saved ${formatMoney(wish.price_cents, wish.currency)}.`);
          }
          router.back();
        },
        onError: () => Alert.alert("Couldn't save", 'Check your connection and try again.'),
      },
    );
  };

  const remove = () =>
    Alert.alert('Remove from wishlist?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => del.mutate(wish, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: space.xxxl }}
    >
      <Stack.Screen options={{ title: '' }} />
      <View
        style={{
          height: 260,
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
            style={{ width: '80%', height: '85%' }}
          />
        ) : (
          <T variant="muted">No photo</T>
        )}
      </View>
      <View style={{ gap: space.xs }}>
        <T variant="title">{wish.name ?? categoryLabel(wish.category)}</T>
        <T variant="muted">
          {[wish.brand, formatMoney(wish.price_cents, wish.currency), wish.shop]
            .filter(Boolean)
            .join(' · ')}
        </T>
        {sizeHint ? <T>{sizeHint}</T> : null}
        {wish.url ? (
          <T
            accessibilityRole="link"
            style={{ color: colors.highlight, fontWeight: '600' }}
            onPress={() => WebBrowser.openBrowserAsync(wish.url!)}
          >
            Open in shop ↗
          </T>
        ) : null}
      </View>

      <MatchCard result={result} />

      {wish.decision ? (
        <T
          style={{
            fontWeight: '600',
            color: wish.decision === 'bought' ? colors.success : colors.textMuted,
          }}
        >
          {wish.decision === 'bought' ? 'You bought this.' : 'You skipped this.'}
        </T>
      ) : due || early ? (
        <View style={{ gap: space.m }}>
          <T variant="title">Still want it?</T>
          <Button
            label={
              wish.price_cents
                ? `Skip — save ${formatMoney(wish.price_cents, wish.currency)}`
                : 'Skip'
            }
            kind="secondary"
            onPress={() => choose('skipped')}
            loading={decide.isPending}
          />
          <Button label="Bought" onPress={() => choose('bought')} loading={decide.isPending} />
        </View>
      ) : (
        <View style={{ gap: space.m }}>
          <T style={{ color: colors.highlight, fontWeight: '600' }}>
            {countdownLabel(wish.decide_at)}
          </T>
          <T variant="muted">We&apos;ll remind you when it&apos;s time to decide.</T>
          <Button label="Decide early?" kind="secondary" onPress={() => setEarly(true)} />
        </View>
      )}

      <Button label="Remove from wishlist" kind="danger" onPress={remove} loading={del.isPending} />
    </ScrollView>
  );
}
