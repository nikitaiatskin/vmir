import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { useBrandSizeHint } from '@/api/brand-sizes';
import { insertItem, itemKeys } from '@/api/items';
import { Shimmer } from '@/components/item-image';
import { ItemForm, type SuggestedFields } from '@/components/item-form';
import { Button, T } from '@/components/ui';
import { emptyItemForm, formToColumns, type ItemFormDraft } from '@/features/items';
import { processPhoto, suggestFor, type ProcessedPhoto } from '@/features/process-photo';
import { newImagePath, uploadImage } from '@/lib/images';
import { pickPhotos, type Picked } from '@/lib/pick-photos';
import { requireUserId } from '@/lib/supabase';
import { useTheme } from '@/theme';

function parsePhotos(raw: string | undefined): Picked[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as Picked[]).filter((p) => typeof p?.uri === 'string') : [];
  } catch {
    return [];
  }
}

/** Add item (US-1.1, US-1.2): pick → on-device processing → form with AI suggestions → save. */
export default function AddItemScreen() {
  const params = useLocalSearchParams<{ photos?: string }>();
  const { colors, space } = useTheme();
  const [queue, setQueue] = useState<Picked[]>(() => parsePhotos(params.photos));
  const [index, setIndex] = useState(0);
  const current = queue[index];

  const choose = async (source: 'camera' | 'library') => {
    const picked = await pickPhotos(source);
    if (picked.length) {
      setQueue(picked);
      setIndex(0);
    }
  };

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.l, gap: space.m }}>
        <T variant="muted" style={{ marginVertical: space.l }}>
          Photograph one item on a plain background. The background is removed on your iPhone.
        </T>
        <Button label="Take photo" onPress={() => choose('camera')} />
        <Button label="Choose from library" kind="secondary" onPress={() => choose('library')} />
      </View>
    );
  }

  const next = () => {
    if (index + 1 < queue.length) setIndex(index + 1);
    else router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{ title: queue.length > 1 ? `Item ${index + 1} of ${queue.length}` : 'Add item' }}
      />
      <PhotoEditor
        key={`${index}-${current.uri}`}
        photo={current}
        onDone={next}
        canSkip={queue.length > 1}
      />
    </>
  );
}

function PhotoEditor({
  photo,
  onDone,
  canSkip,
}: {
  photo: Picked;
  onDone: () => void;
  canSkip: boolean;
}) {
  const { colors, space, radius } = useTheme();
  const qc = useQueryClient();
  const [processed, setProcessed] = useState<ProcessedPhoto | null>(null);
  const [draft, setDraft] = useState<ItemFormDraft>(emptyItemForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormDraft, string>>>({});
  const [suggested, setSuggested] = useState<SuggestedFields>({});
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const touched = useRef(new Set<keyof ItemFormDraft>());
  const sizeHint = useBrandSizeHint(draft.brand, draft.category);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await processPhoto(photo.uri, photo.width, photo.height);
      if (!alive) return;
      setProcessed(p);
      if (p.colors.length && !touched.current.has('colors')) {
        setDraft((d) => ({ ...d, colors: p.colors }));
        setSuggested((s) => ({ ...s, colors: true }));
      }
      setThinking(true);
      const ai = await suggestFor(p);
      if (!alive) return;
      setThinking(false);
      if (!ai) return;
      // Only fill fields the user has not edited yet; mark them as suggested (US-1.8).
      const t = touched.current;
      const marks: SuggestedFields = {
        category: !t.has('category'),
        name: !t.has('name') && !!ai.name,
        seasons: !t.has('seasons') && ai.seasons.length > 0,
      };
      setDraft((d) => ({
        ...d,
        ...(marks.category ? { category: ai.category } : {}),
        ...(marks.name ? { name: ai.name } : {}),
        ...(marks.seasons ? { seasons: ai.seasons } : {}),
      }));
      setSuggested((s) => ({ ...s, ...marks }));
    })();
    return () => {
      alive = false;
    };
  }, [photo]);

  const save = async () => {
    if (!processed) return;
    const result = formToColumns(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      const userId = await requireUserId();
      const photoPath = await uploadImage(
        'item-photos',
        newImagePath(userId, 'jpg'),
        processed.photoUri,
      );
      const cutoutPath = processed.cutoutUri
        ? await uploadImage(
            'item-photos',
            newImagePath(userId, 'png', 'cutout-'),
            processed.cutoutUri,
          )
        : null;
      await insertItem({
        ...result.columns,
        photo_path: photoPath,
        cutout_path: cutoutPath,
        processing_status: cutoutPath ? 'done' : 'failed',
        colors_edited: touched.current.has('colors'),
      });
      await qc.invalidateQueries({ queryKey: itemKeys.all });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
    } catch {
      Alert.alert("Couldn't save", 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const preview = processed?.cutoutUri ?? processed?.photoUri ?? photo.uri;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: 120 }}
      >
        <View
          style={{
            height: 280,
            borderRadius: radius.tile,
            backgroundColor: colors.surfaceMuted,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={{ uri: preview }}
            contentFit="contain"
            style={{ width: '80%', height: '85%' }}
          />
          {!processed ? <Shimmer /> : null}
        </View>
        {!processed ? <T variant="muted">Removing background…</T> : null}
        {processed && !processed.cutoutUri ? (
          <T variant="muted">Couldn&apos;t find the item in the photo, so the original is kept.</T>
        ) : null}
        {thinking ? <T variant="muted">✨ Apple Intelligence is filling in the details…</T> : null}
        <ItemForm
          value={draft}
          errors={errors}
          suggested={suggested}
          sizeHint={sizeHint}
          onChange={(v, field) => {
            touched.current.add(field);
            setSuggested((s) => ({ ...s, [field]: false }));
            setErrors((e) => ({ ...e, [field]: undefined }));
            setDraft(v);
          }}
        />
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
          flexDirection: 'row',
          gap: space.m,
        }}
      >
        {canSkip ? (
          <Button label="Skip" kind="secondary" onPress={onDone} style={{ flex: 1 }} />
        ) : null}
        <Button
          label="Save"
          onPress={save}
          loading={saving}
          disabled={!processed}
          style={{ flex: 2 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
