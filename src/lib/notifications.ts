import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { reminderDate } from '@/features/cooloff';
import { formatMoney } from '@/features/money';
import type { WishRow } from '@/types/database';

/** Local cool-off reminders (SPEC §5): no push server, IDs stored by wish id. */

const KEY = 'cooloff-notification-ids';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function loadIds(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveIds(ids: Record<string, string>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(ids));
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

type Remindable = Pick<
  WishRow,
  'id' | 'name' | 'brand' | 'price_cents' | 'currency' | 'decide_at' | 'decision'
>;

export async function scheduleCooloffReminder(wish: Remindable) {
  await cancelCooloffReminder(wish.id);
  if (wish.decision) return;
  const when = reminderDate(wish.decide_at);
  if (!when) return;
  if (!(await ensurePermission())) return;
  const what = [wish.brand, wish.name].filter(Boolean).join(' ') || 'that wishlist item';
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Still want it?',
      body: `${what}${wish.price_cents != null ? ` · ${formatMoney(wish.price_cents, wish.currency)}` : ''}. Time to decide.`,
      data: { wishId: wish.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
  const ids = await loadIds();
  ids[wish.id] = id;
  await saveIds(ids);
}

export async function cancelCooloffReminder(wishId: string) {
  const ids = await loadIds();
  const id = ids[wishId];
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  delete ids[wishId];
  await saveIds(ids);
}

/** Re-creates reminders after a reinstall or on a new device, and drops stale ones. */
export async function syncCooloffReminders(wishes: readonly Remindable[]) {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  const ids = await loadIds();
  const open = new Set(wishes.filter((w) => !w.decision).map((w) => w.id));
  for (const wishId of Object.keys(ids)) {
    if (!open.has(wishId)) await cancelCooloffReminder(wishId);
  }
  const scheduled = new Set(
    (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier),
  );
  for (const w of wishes) {
    const existing = ids[w.id];
    if (!w.decision && (!existing || !scheduled.has(existing))) await scheduleCooloffReminder(w);
  }
}
