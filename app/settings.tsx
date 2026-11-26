import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { useBrandSizes, useDeleteBrandSize, useSaveBrandSize } from '@/api/brand-sizes';
import { ChoiceChips, Field } from '@/components/form';
import { Button, Screen, Section, T } from '@/components/ui';
import { getAIAvailability } from '@/features/vision';
import { removeImages } from '@/lib/images';
import { ensurePermission } from '@/lib/notifications';
import { updateSettings, useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import type { ItemCategory } from '@/types/database';
import { CATEGORIES, categoryLabel, COOLOFF_OPTIONS, type CooloffDays } from '@/types/domain';

const AI_TEXT: Record<string, string> = {
  available: 'On — item details are suggested on this iPhone.',
  turnedOff: 'Turned off. Turn on Apple Intelligence in iOS Settings to get suggestions.',
  notReady: 'Getting ready. Apple Intelligence is still downloading.',
  notSupported: 'Not available on this iPhone. You can fill in details by hand.',
};

export default function SettingsScreen() {
  const { colors, space } = useTheme();
  const qc = useQueryClient();
  const settings = useSettings();
  const sizes = useBrandSizes();
  const saveSize = useSaveBrandSize();
  const deleteSize = useDeleteBrandSize();
  const ai = useQuery({ queryKey: ['ai-availability'], queryFn: getAIAvailability });
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);

  const addSize = () => {
    if (!brand.trim() || !size.trim()) return;
    saveSize.mutate(
      { brand: brand.trim(), size: size.trim(), category },
      {
        onSuccess: () => {
          setBrand('');
          setSize('');
          setCategory(null);
        },
        onError: () =>
          Alert.alert('Already saved', 'You already have a size for this brand and category.'),
      },
    );
  };

  const deleteAll = () =>
    Alert.alert(
      'Delete all my data?',
      'Your wardrobe, outfits, wishlist, wears and photos will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: session } = await supabase.auth.getSession();
              const uid = session.session?.user.id;
              if (uid) {
                for (const bucket of ['item-photos', 'outfit-images'] as const) {
                  const { data: files } = await supabase.storage
                    .from(bucket)
                    .list(uid, { limit: 1000 });
                  await removeImages(
                    bucket,
                    (files ?? []).map((f) => `${uid}/${f.name}`),
                  );
                }
              }
              const { error } = await supabase.rpc('delete_my_data');
              if (error) throw error;
              await Notifications.cancelAllScheduledNotificationsAsync();
              await qc.invalidateQueries();
              Alert.alert('All data deleted');
            } catch {
              Alert.alert("Couldn't delete", 'Check your connection and try again.');
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <Section title="Apple Intelligence">
        <T variant="muted">{AI_TEXT[ai.data ?? 'notSupported']}</T>
      </Section>

      <Section title="Default waiting time">
        <ChoiceChips<`${CooloffDays}`>
          label="Wishlist cool-off"
          options={COOLOFF_OPTIONS.map((d) => ({ value: `${d}` as const, label: `${d} days` }))}
          selected={[`${settings.defaultCooloff}`]}
          onToggle={(v) => updateSettings({ defaultCooloff: Number(v) as CooloffDays })}
        />
      </Section>

      <Section title="Reminders">
        <Button
          label="Allow reminders"
          kind="secondary"
          onPress={async () => {
            if (!(await ensurePermission())) void Linking.openSettings();
          }}
        />
      </Section>

      <Section title="My sizes by brand">
        {(sizes.data ?? []).map((s) => (
          <View
            key={s.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: space.xs,
            }}
          >
            <T>
              {s.brand}
              {s.category ? ` · ${categoryLabel(s.category)}` : ''}:{' '}
              <T style={{ fontWeight: '600' }}>{s.size}</T>
            </T>
            <Pressable
              accessibilityLabel={`Delete ${s.brand} size`}
              onPress={() => deleteSize.mutate(s.id)}
              hitSlop={10}
            >
              <T style={{ color: colors.danger }}>Delete</T>
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <View style={{ flex: 2 }}>
            <Field label="Brand" placeholder="Zara" value={brand} onChangeText={setBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Size"
              placeholder="M"
              value={size}
              onChangeText={setSize}
              autoCapitalize="characters"
            />
          </View>
        </View>
        <ChoiceChips<ItemCategory>
          label="Only for (optional)"
          options={CATEGORIES}
          selected={category ? [category] : []}
          onToggle={(c) => setCategory(category === c ? null : c)}
        />
        <Button label="Save size" kind="secondary" onPress={addSize} loading={saveSize.isPending} />
      </Section>

      <Section title="Privacy">
        <T variant="muted">
          Photos are processed on your iPhone. Your data is stored privately and only you can see
          it.
        </T>
        <Button label="Delete all my data" kind="danger" onPress={deleteAll} />
      </Section>
    </Screen>
  );
}
