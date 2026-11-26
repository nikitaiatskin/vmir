import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function WardrobeLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerLargeTitle: true,
        headerLargeTitleStyle: { fontFamily: 'ui-serif' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Wardrobe' }} />
      <Stack.Screen name="[itemId]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
