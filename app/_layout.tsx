import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { EmptyState, Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useTheme } from '@/theme';

function AuthGate() {
  const auth = useAuth();
  const { colors } = useTheme();

  if (auth.status === 'loading') return <Loading />;
  if (auth.status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <EmptyState text={auth.message} action="Try again" onAction={auth.retry} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-item" options={{ presentation: 'modal', title: 'Add item' }} />
      <Stack.Screen name="edit-item/[id]" options={{ presentation: 'modal', title: 'Edit item' }} />
      <Stack.Screen name="add-wish" options={{ presentation: 'modal', title: 'Add to wishlist' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const { dark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <AuthGate />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
