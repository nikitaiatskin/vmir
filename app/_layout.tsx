import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { EmptyState, Loading } from '@/components/ui';
import { useWishes } from '@/api/wishes';
import { AuthProvider, useAuth } from '@/lib/auth';
import { syncCooloffReminders } from '@/lib/notifications';
import { useTheme } from '@/theme';

/** Opens the wish when a cool-off reminder is tapped, and keeps reminders in sync (US-4.2). */
function ReminderBridge() {
  const wishes = useWishes();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const wishId = response?.notification.request.content.data?.wishId;
    if (typeof wishId === 'string') router.push(`/wishlist/${wishId}`);
  }, [response]);

  useEffect(() => {
    if (wishes.data) void syncCooloffReminders(wishes.data).catch(() => undefined);
  }, [wishes.data]);

  return null;
}

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
    <>
      <ReminderBridge />
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
        <Stack.Screen
          name="edit-item/[id]"
          options={{ presentation: 'modal', title: 'Edit item' }}
        />
        <Stack.Screen
          name="add-wish"
          options={{ presentation: 'modal', title: 'Add to wishlist' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
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
