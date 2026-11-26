import { View } from 'react-native';

import type { ItemFormDraft } from '@/features/items';
import { useTheme } from '@/theme';
import type { ItemCategory, Season } from '@/types/database';
import { CATEGORIES, SEASONS } from '@/types/domain';

import { ChoiceChips, ColorPicker, Field } from './form';

export type SuggestedFields = Partial<Record<keyof ItemFormDraft, boolean>>;

/** Item details form shared by "Add item" and "Edit item" (US-1.4, US-1.5, US-1.8). */
export function ItemForm({
  value,
  onChange,
  errors = {},
  suggested = {},
  sizeHint,
}: {
  value: ItemFormDraft;
  onChange: (next: ItemFormDraft, field: keyof ItemFormDraft) => void;
  errors?: Partial<Record<keyof ItemFormDraft, string>>;
  suggested?: SuggestedFields;
  sizeHint?: string;
}) {
  const { space } = useTheme();
  const set = <K extends keyof ItemFormDraft>(k: K, v: ItemFormDraft[K]) =>
    onChange({ ...value, [k]: v }, k);

  return (
    <View style={{ gap: space.xl }}>
      <ChoiceChips<ItemCategory>
        label="Category"
        options={CATEGORIES}
        selected={value.category ? [value.category] : []}
        onToggle={(c) => set('category', c)}
        suggested={suggested.category}
        error={errors.category}
      />
      <Field
        label="Name"
        placeholder="White linen shirt"
        value={value.name}
        onChangeText={(t) => set('name', t)}
        suggested={suggested.name}
        error={errors.name}
        maxLength={80}
      />
      <ColorPicker
        value={value.colors}
        onChange={(c) => set('colors', c)}
        suggested={suggested.colors}
      />
      <ChoiceChips<Season>
        label="Seasons"
        options={SEASONS}
        selected={value.seasons}
        onToggle={(s) =>
          set(
            'seasons',
            value.seasons.includes(s)
              ? value.seasons.filter((x) => x !== s)
              : [...value.seasons, s],
          )
        }
        suggested={suggested.seasons}
      />
      <View style={{ flexDirection: 'row', gap: space.m }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Brand"
            placeholder="COS"
            value={value.brand}
            onChangeText={(t) => set('brand', t)}
            autoCapitalize="words"
            maxLength={60}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Size"
            placeholder="M"
            value={value.size}
            onChangeText={(t) => set('size', t)}
            hint={sizeHint}
            autoCapitalize="characters"
            maxLength={20}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.m }}>
        <View style={{ flex: 1 }}>
          <Field
            label={`Price (${value.currency})`}
            placeholder="49.99"
            value={value.price}
            onChangeText={(t) => set('price', t)}
            keyboardType="decimal-pad"
            error={errors.price}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Bought on"
            placeholder="2026-11-26"
            value={value.purchasedAt}
            onChangeText={(t) => set('purchasedAt', t)}
            keyboardType="numbers-and-punctuation"
            error={errors.purchasedAt}
            maxLength={10}
          />
        </View>
      </View>
    </View>
  );
}
