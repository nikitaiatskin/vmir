import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function WishlistLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Wishlist' }} />
      <Stack.Screen name="[wishId]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
