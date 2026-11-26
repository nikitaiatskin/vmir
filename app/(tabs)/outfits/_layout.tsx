import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function OutfitsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Outfits' }} />
      <Stack.Screen name="builder" options={{ title: 'New outfit', headerLargeTitle: false }} />
      <Stack.Screen name="[outfitId]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
