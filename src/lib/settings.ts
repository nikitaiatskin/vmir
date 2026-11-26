import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { CooloffDays } from '@/types/domain';

/** Small per-device preferences (SPEC §4 Settings). */
export type Settings = { defaultCooloff: CooloffDays };

const KEY = 'settings';
const defaults: Settings = { defaultCooloff: 14 };
let cache: Settings = defaults;
const listeners = new Set<(s: Settings) => void>();

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) {
      cache = { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) };
      listeners.forEach((l) => l(cache));
    }
  })
  .catch(() => undefined);

export function useSettings() {
  const [s, setS] = useState(cache);
  useEffect(() => {
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

export async function updateSettings(patch: Partial<Settings>) {
  cache = { ...cache, ...patch };
  listeners.forEach((l) => l(cache));
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}
