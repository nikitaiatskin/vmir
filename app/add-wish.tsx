import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { useBrandSizeHint } from '@/api/brand-sizes';
import { useCreateWish } from '@/api/wishes';
import { ChoiceChips, Field, SuggestedBadge } from '@/components/form';
import { Shimmer } from '@/components/item-image';
import { Button, T } from '@/components/ui';
import { extractColors, readShopScreenshot, removeBackground } from '@/features/vision';
import { emptyWish, shopFromUrl, wishToColumns, type WishDraft } from '@/features/wish-form';
import { newImagePath, prepareForUpload, uploadImage } from '@/lib/images';
import { pickPhotos } from '@/lib/pick-photos';
import { useSettings } from '@/lib/settings';
import { requireUserId } from '@/lib/supabase';
import { useTheme } from '@/theme';
import type { ItemCategory } from '@/types/database';
import { CATEGORIES, COOLOFF_OPTIONS, type CooloffDays } from '@/types/domain';

type Photo = { photoUri: string; cutoutUri: string | null; colors: string[] };

/**
 * Add to wishlist (US-3.1, US-3.2, US-3.6): photo, shop screenshot or link.
 * `hanger://add-wish?url=…` opens this screen with the link filled in.
 */
export default function AddWishScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const { colors, space, radius } = useTheme();
  const settings = useSettings();
  const create = useCreateWish();
  const [draft, setDraft] = useState<WishDraft>(() => {
    const d = emptyWish(settings.defaultCooloff);
    return params.url ? { ...d, url: params.url, shop: shopFromUrl(params.url) } : d;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof WishDraft, string>>>({});
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState<null | 'photo' | 'screenshot'>(null);
  const [suggested, setSuggested] = useState<Partial<Record<keyof WishDraft, boolean>>>({});
  const sizeHint = useBrandSizeHint(draft.brand, draft.category);
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const set = <K extends keyof WishDraft>(k: K, v: WishDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSuggested((s) => ({ ...s, [k]: false }));
  };

  const addPhoto = async (kind: 'photo' | 'screenshot', source: 'camera' | 'library') => {
    const [picked] = await pickPhotos(source, { multiple: false });
    if (!picked) return;
    setBusy(kind);
    try {
      const prepared = await prepareForUpload(picked.uri, picked.width, picked.height);
      // For screenshots, read text from the full-resolution original.
      const reading =
        kind === 'screenshot' ? readShopScreenshot(picked.uri) : Promise.resolve(null);
      const cutoutUri = await removeBackground(prepared);
      const extracted = await extractColors(cutoutUri ?? prepared);
      setPhoto({ photoUri: prepared, cutoutUri, colors: extracted });
      const read = await reading;
      if (read) {
        const d = latest.current;
        const marks: Partial<Record<keyof WishDraft, boolean>> = {
          brand: !!read.brand && !d.brand,
          name: !!read.name && !d.name,
          price: read.priceCents != null && !d.price,
          category: !!read.category && !d.category,
        };
        setDraft((cur) => ({
          ...cur,
          ...(marks.brand && read.brand ? { brand: read.brand } : {}),
          ...(marks.name && read.name ? { name: read.name } : {}),
          ...(marks.price && read.priceCents != null
            ? { price: (read.priceCents / 100).toFixed(2) }
            : {}),
          ...(marks.category && read.category ? { category: read.category } : {}),
          ...(read.currency ? { currency: read.currency } : {}),
        }));
        setSuggested(marks);
      }
    } finally {
      setBusy(null);
    }
  };

  const pasteLink = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    const url = text.match(/https?:\/\/\S+/i)?.[0];
    if (!url)
      return Alert.alert('No link on the clipboard', 'Copy the product link in Safari first.');
    setDraft((d) => ({ ...d, url, shop: d.shop || shopFromUrl(url) }));
  };

  const save = async () => {
    const result = wishToColumns(draft);
    if (!result.ok) return setErrors(result.errors);
    try {
      const userId = await requireUserId();
      const photoPath = photo
        ? await uploadImage('item-photos', newImagePath(userId, 'jpg', 'wish-'), photo.photoUri)
        : null;
      const cutoutPath = photo?.cutoutUri
        ? await uploadImage(
            'item-photos',
            newImagePath(userId, 'png', 'wish-cutout-'),
            photo.cutoutUri,
          )
        : null;
      await create.mutateAsync({
        ...result.columns,
        photo_path: photoPath,
        cutout_path: cutoutPath,
        colors: photo?.colors ?? [],
        processing_status: cutoutPath ? 'done' : 'failed',
      });
      router.back();
    } catch {
      Alert.alert("Couldn't save", 'Check your connection and try again.');
    }
  };

  const preview = photo?.cutoutUri ?? photo?.photoUri;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: 140 }}
      >
        <View
          style={{
            height: 200,
            borderRadius: radius.tile,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {preview ? (
            <Image
              source={{ uri: preview }}
              contentFit="contain"
              style={{ width: '80%', height: '85%' }}
            />
          ) : busy ? null : (
            <T variant="muted">No photo yet</T>
          )}
          {busy ? <Shimmer /> : null}
        </View>
        {busy === 'screenshot' ? <T variant="muted">Reading the screenshot…</T> : null}
        <View style={{ flexDirection: 'row', gap: space.s, flexWrap: 'wrap' }}>
          <Button label="Photo" kind="secondary" onPress={() => addPhoto('photo', 'camera')} />
          <Button
            label="From library"
            kind="secondary"
            onPress={() => addPhoto('photo', 'library')}
          />
          <Button
            label="Shop screenshot"
            kind="secondary"
            onPress={() => addPhoto('screenshot', 'library')}
          />
        </View>

        <ChoiceChips<ItemCategory>
          label="Category"
          options={CATEGORIES}
          selected={draft.category ? [draft.category] : []}
          onToggle={(c) => set('category', c)}
          suggested={suggested.category}
          error={errors.category}
        />
        <Field
          label="Name"
          placeholder="Relaxed wool coat"
          value={draft.name}
          onChangeText={(t) => set('name', t)}
          suggested={suggested.name}
        />
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Brand"
              placeholder="COS"
              value={draft.brand}
              onChangeText={(t) => set('brand', t)}
              suggested={suggested.brand}
              hint={sizeHint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={`Price (${draft.currency})`}
              placeholder="89.00"
              keyboardType="decimal-pad"
              value={draft.price}
              onChangeText={(t) => set('price', t)}
              suggested={suggested.price}
              error={errors.price}
            />
          </View>
        </View>
        <View style={{ gap: space.s }}>
          <Field
            label="Link"
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
            value={draft.url}
            onChangeText={(t) => set('url', t)}
            error={errors.url}
          />
          <Button label="Paste link" kind="secondary" onPress={pasteLink} />
        </View>
        <Field
          label="Shop"
          placeholder="Zalando"
          value={draft.shop}
          onChangeText={(t) => set('shop', t)}
        />
        <ChoiceChips<`${CooloffDays}`>
          label="Wait before deciding"
          options={COOLOFF_OPTIONS.map((d) => ({ value: `${d}` as const, label: `${d} days` }))}
          selected={[`${draft.cooloffDays}`]}
          onToggle={(v) => set('cooloffDays', Number(v) as CooloffDays)}
        />
        {Object.values(suggested).some(Boolean) ? (
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <SuggestedBadge />
            <T variant="muted">Read from your screenshot — check before saving.</T>
          </View>
        ) : null}
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.l,
          paddingBottom: space.xxl,
          backgroundColor: colors.bg,
        }}
      >
        <Button
          label="Add to wishlist"
          onPress={save}
          loading={create.isPending}
          disabled={!!busy}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
