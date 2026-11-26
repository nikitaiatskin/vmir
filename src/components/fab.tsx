import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

/** Floating "+" button (DESIGN.md §5 FAB). */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      })}
    >
      <SymbolView name="plus" tintColor={colors.onAccent} size={24} weight="semibold" />
    </Pressable>
  );
}
