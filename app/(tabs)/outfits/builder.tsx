import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useItems } from '@/api/items';
import { type OutfitWithItems, useOutfit, useSaveOutfit } from '@/api/outfits';
import { ChoiceChips, Field } from '@/components/form';
import { OutfitCanvas } from '@/components/outfit-canvas';
import { Button, Chips, EmptyState, Loading, T } from '@/components/ui';
import { itemTitle } from '@/features/items';
import { moveLayer, newPlacement, normaliseTag, type Placement } from '@/features/outfits';
import { useSignedUrls } from '@/lib/images';
import { useTheme } from '@/theme';
import type { ItemCategory } from '@/types/database';
import { CATEGORIES, OUTFIT_TAGS } from '@/types/domain';

/** Outfit builder (US-2.1 – US-2.3). `?outfitId=` edits an existing outfit. */
export default function BuilderScreen() {
  const { outfitId } = useLocalSearchParams<{ outfitId?: string }>();
  const existing = useOutfit(outfitId);
  if (outfitId && existing.isLoading) return <Loading />;
  return <Builder key={existing.data?.id ?? 'new'} outfit={existing.data} />;
}

function toPlacements(o: OutfitWithItems | undefined): Placement[] {
  return (o?.outfit_items ?? []).map((oi) => ({
    key: oi.id,
    itemId: oi.item_id,
    x: oi.x,
    y: oi.y,
    scale: oi.scale,
    rotation: oi.rotation,
    z: oi.z_index,
  }));
}

function Builder({ outfit }: { outfit: OutfitWithItems | undefined }) {
  const { colors, space, radius } = useTheme();
  const { width, height } = useWindowDimensions();
  const canvasRef = useRef<ComponentRef<typeof View>>(null);
  const items = useItems();
  const save = useSaveOutfit();

  const [placements, setPlacements] = useState<Placement[]>(() => toPlacements(outfit));
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState(outfit?.name ?? '');
  const [tags, setTags] = useState<string[]>(outfit?.tags ?? []);
  const [customTag, setCustomTag] = useState('');

  const allItems = useMemo(() => items.data ?? [], [items.data]);
  const drawerItems = allItems.filter((i) => !category || i.category === category);
  const paths = allItems.map((i) => i.cutout_path ?? i.photo_path);
  const signed = useSignedUrls('item-photos', paths);
  const urls = useMemo(() => {
    const m: Record<string, { url?: string; cacheKey: string }> = {};
    for (const i of allItems) {
      const p = i.cutout_path ?? i.photo_path;
      m[i.id] = { url: signed.data?.[p], cacheKey: p };
    }
    return m;
  }, [allItems, signed.data]);

  const canvas = { width, height: Math.round(height * 0.5) };

  const add = (itemId: string) => {
    void Haptics.selectionAsync();
    const p = newPlacement(placements, itemId, randomUUID());
    setPlacements([...placements, p]);
    setSelected(p.key);
  };

  const updatePlacement = (p: Placement) =>
    setPlacements((list) => list.map((x) => (x.key === p.key ? p : x)));

  const doSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert('Give your outfit a name');
    setSelected(null);
    // Let the selection border disappear before taking the snapshot.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const previewUri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      await save.mutateAsync({
        id: outfit?.id,
        name: trimmed,
        tags,
        placements,
        previewUri,
        oldPreviewPath: outfit?.preview_path,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveOpen(false);
      router.back();
    } catch {
      Alert.alert("Couldn't save the outfit", 'Check your connection and try again.');
    }
  };

  if (items.isLoading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: outfit ? 'Edit outfit' : 'New outfit',
          headerLargeTitle: false,
          headerRight: () => (
            <T
              accessibilityRole="button"
              onPress={() => (placements.length ? setSaveOpen(true) : undefined)}
              style={{ fontWeight: '600', opacity: placements.length ? 1 : 0.4 }}
            >
              Save
            </T>
          ),
        }}
      />

      <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
        <OutfitCanvas
          canvasRef={canvasRef}
          size={canvas}
          placements={placements}
          urls={urls}
          selected={selected}
          onSelect={setSelected}
          onChange={updatePlacement}
        />
        {placements.length === 0 ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}
          >
            <T variant="muted" style={{ textAlign: 'center' }}>
              Tap items below to add them.{'\n'}Drag, pinch and rotate to arrange.
            </T>
          </View>
        ) : null}
      </View>

      {selected ? (
        <View
          style={{ flexDirection: 'row', gap: space.s, padding: space.s, justifyContent: 'center' }}
        >
          <Button
            label="Bring forward"
            kind="secondary"
            onPress={() => setPlacements((l) => moveLayer(l, selected, 'forward'))}
          />
          <Button
            label="Send back"
            kind="secondary"
            onPress={() => setPlacements((l) => moveLayer(l, selected, 'backward'))}
          />
          <Button
            label="Remove"
            kind="danger"
            onPress={() => {
              setPlacements((l) => l.filter((p) => p.key !== selected));
              setSelected(null);
            }}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingTop: space.m, gap: space.m }}>
        <Chips<ItemCategory> options={CATEGORIES} value={category} onChange={setCategory} />
        {allItems.length === 0 ? (
          <EmptyState text="Add clothes to your wardrobe first." />
        ) : (
          <FlatList
            horizontal
            data={drawerItems}
            keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}
            renderItem={({ item }) => {
              const u = urls[item.id];
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${itemTitle(item)}`}
                  onPress={() => add(item.id)}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: radius.tile,
                    backgroundColor: colors.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {u?.url ? (
                    <Image
                      source={{ uri: u.url, cacheKey: u.cacheKey }}
                      contentFit="contain"
                      style={{ width: '80%', height: '80%' }}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Modal
        visible={saveOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSaveOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
          <ScrollView
            contentContainerStyle={{ padding: space.l, gap: space.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <T variant="title">Save outfit</T>
            <Field
              label="Name"
              placeholder="Monday meeting"
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoFocus
            />
            <ChoiceChips
              label="Tags"
              options={[...new Set([...OUTFIT_TAGS, ...tags])].map((t) => ({ value: t, label: t }))}
              selected={tags}
              onToggle={(t) =>
                setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
              }
            />
            <Field
              label="Custom tag"
              placeholder="date-night"
              value={customTag}
              onChangeText={setCustomTag}
              returnKeyType="done"
              onSubmitEditing={() => {
                const t = normaliseTag(customTag);
                if (t && !tags.includes(t)) setTags([...tags, t]);
                setCustomTag('');
              }}
            />
            <Button label="Save outfit" onPress={doSave} loading={save.isPending} />
            <Button label="Cancel" kind="secondary" onPress={() => setSaveOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
