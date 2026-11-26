import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { useBrandSizeHint } from '@/api/brand-sizes';
import { useItem, useUpdateItem } from '@/api/items';
import { ItemForm } from '@/components/item-form';
import { Button, ErrorState, Loading } from '@/components/ui';
import { formToColumns, itemToForm, type ItemFormDraft } from '@/features/items';
import type { ItemRow } from '@/types/database';
import { useTheme } from '@/theme';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, isError, refetch } = useItem(id);
  if (isLoading) return <Loading />;
  if (isError || !item) return <ErrorState onRetry={refetch} />;
  return <EditItemForm item={item} />;
}

function EditItemForm({ item }: { item: ItemRow }) {
  const { colors, space } = useTheme();
  const update = useUpdateItem();
  const [draft, setDraft] = useState<ItemFormDraft>(() => itemToForm(item));
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormDraft, string>>>({});
  const [colorsEdited, setColorsEdited] = useState(false);
  const sizeHint = useBrandSizeHint(draft.brand, draft.category);
  const save = () => {
    const result = formToColumns(draft);
    if (!result.ok) return setErrors(result.errors);
    update.mutate(
      { id: item.id, values: { ...result.columns, colors_edited: item.colors_edited || colorsEdited } },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert("Couldn't save", 'Check your connection and try again.'),
      },
    );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.l, gap: space.xl, paddingBottom: 120 }}
      >
        <ItemForm
          value={draft}
          errors={errors}
          sizeHint={sizeHint}
          onChange={(v, field) => {
            if (field === 'colors') setColorsEdited(true);
            setErrors((e) => ({ ...e, [field]: undefined }));
            setDraft(v);
          }}
        />
      </ScrollView>
      <View style={{ padding: space.l, paddingBottom: space.xxl }}>
        <Button label="Save changes" onPress={save} loading={update.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}
