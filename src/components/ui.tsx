import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'number' | 'muted';

/** Text that always uses theme tokens (DESIGN.md §3). */
export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { colors, type } = useTheme();
  const base =
    variant === 'muted'
      ? { ...type.body, color: colors.textMuted }
      : { ...type[variant], color: variant === 'label' ? colors.textMuted : colors.text };
  return <Text maxFontSizeMultiplier={1.8} style={[base, style]} {...rest} />;
}

/** Full-screen scroll container with theme background and screen padding. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors, space } = useTheme();
  if (!scroll) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: space.l, gap: space.l, paddingBottom: space.xxxl }}
    >
      {children}
    </ScrollView>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  kind?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
};

/** Pill button (DESIGN.md §5 PrimaryButton). */
export function Button({
  label,
  kind = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radius, space } = useTheme();
  const bg = kind === 'primary' ? colors.accent : 'transparent';
  const fg = kind === 'primary' ? colors.onAccent : kind === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: 52,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: kind === 'primary' ? 0 : StyleSheet.hairlineWidth * 2,
          borderColor: kind === 'danger' ? colors.danger : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.xl,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Empty state with one sentence and one action (DESIGN.md §7). */
export function EmptyState({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  const { space } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.l, paddingVertical: space.xxxl }}>
      <T variant="title" style={{ fontSize: 48, lineHeight: 56 }} accessibilityElementsHidden>
        ⌒
      </T>
      <T variant="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
        {text}
      </T>
      {action && onAction ? <Button label={action} onPress={onAction} /> : null}
    </View>
  );
}

/** Error state with retry. Never shows raw error codes (SPEC §6). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      text="Something went wrong. Check your connection and try again."
      action="Try again"
      onAction={onRetry}
    />
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}

/** Horizontally scrolling filter chips (DESIGN.md §5 FilterChips). */
export function Chips<V extends string>({
  options,
  value,
  onChange,
  colorDots,
}: {
  options: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (v: V | null) => void;
  colorDots?: boolean;
}) {
  const { colors, radius, space } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(selected ? null : o.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs + 2,
              paddingHorizontal: space.m,
              height: 34,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.accent : colors.surface,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: selected ? colors.accent : colors.border,
            }}
          >
            {colorDots ? (
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: o.value,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: colors.border,
                }}
              />
            ) : null}
            {colorDots ? null : (
              <Text
                style={{
                  color: selected ? colors.onAccent : colors.text,
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                {o.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Labeled section with a title and optional right action. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space.s }}>
      <T variant="label">{title}</T>
      {children}
    </View>
  );
}
