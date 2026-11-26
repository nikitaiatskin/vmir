import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';

import { T } from './ui';

export function Field({
  label,
  error,
  suggested,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string; suggested?: boolean; hint?: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <View style={{ gap: space.xs + 2 }}>
      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
        <T variant="label">{label}</T>
        {suggested ? <SuggestedBadge /> : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={{
          minHeight: 48,
          borderRadius: radius.tile,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: space.m,
          fontSize: 16,
        }}
        {...input}
      />
      {hint ? (
        <T variant="muted" style={{ fontSize: 13 }}>
          {hint}
        </T>
      ) : null}
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

export function SuggestedBadge() {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityLabel="Suggested by Apple Intelligence"
      style={{ color: colors.highlight, fontSize: 12, fontWeight: '600' }}
    >
      ✨ Suggested
    </Text>
  );
}

/** Wrapping choice chips, single or multi select. */
export function ChoiceChips<V extends string>({
  label,
  options,
  selected,
  onToggle,
  suggested,
  error,
}: {
  label: string;
  options: readonly { value: V; label: string }[];
  selected: readonly V[];
  onToggle: (v: V) => void;
  suggested?: boolean;
  error?: string;
}) {
  const { colors, radius, space } = useTheme();
  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
        <T variant="label">{label}</T>
        {suggested ? <SuggestedBadge /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onToggle(o.value)}
              style={{
                paddingHorizontal: space.m,
                height: 36,
                justifyContent: 'center',
                borderRadius: radius.pill,
                backgroundColor: on ? colors.accent : colors.surface,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: on ? colors.accent : error ? colors.danger : colors.border,
              }}
            >
              <Text style={{ color: on ? colors.onAccent : colors.text, fontSize: 14 }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

/** Colour dots; tap a dot to remove it, tap "+" swatches to add (max 3). */
export function ColorPicker({
  value,
  onChange,
  suggested,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggested?: boolean;
}) {
  const { colors, space } = useTheme();
  const swatches = [
    '#111111',
    '#F7F7F5',
    '#8C8C8C',
    '#D8C3A5',
    '#7B4B2A',
    '#1F2A44',
    '#2F6FD0',
    '#9EC5E8',
    '#3E8E4F',
    '#6B6B2E',
    '#F2C94C',
    '#E8833A',
    '#C62828',
    '#6D1A2B',
    '#EC9EC0',
    '#7E57C2',
  ];
  const dot = (hex: string, size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: hex,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  });
  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
        <T variant="label">Colours</T>
        {suggested ? <SuggestedBadge /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: space.m, minHeight: 36, alignItems: 'center' }}>
        {value.length === 0 ? <T variant="muted">No colours yet</T> : null}
        {value.map((c) => (
          <Pressable
            key={c}
            accessibilityLabel={`Remove colour ${c}`}
            onPress={() => onChange(value.filter((x) => x !== c))}
            style={dot(c, 36)}
          />
        ))}
      </View>
      {value.length < 3 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {swatches
            .filter((s) => !value.includes(s))
            .map((s) => (
              <Pressable
                key={s}
                accessibilityLabel={`Add colour ${s}`}
                onPress={() => onChange([...value, s])}
                style={dot(s, 26)}
              />
            ))}
        </View>
      ) : null}
    </View>
  );
}
