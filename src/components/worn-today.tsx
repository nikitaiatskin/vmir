import * as Haptics from 'expo-haptics';

import { todayISO, useLogWear, useRemoveWears, useWears } from '@/api/wears';

import { Button } from './ui';

/** One-tap wear logging for an item or a whole outfit (US-5.1). Tap again to undo. */
export function WornTodayButton({ itemIds, outfitId }: { itemIds: string[]; outfitId?: string }) {
  const wears = useWears();
  const log = useLogWear();
  const remove = useRemoveWears();
  const today = todayISO();
  const ids = new Set(itemIds);
  const wornToday =
    itemIds.length > 0 &&
    itemIds.every((id) => (wears.data ?? []).some((w) => w.item_id === id && w.worn_on === today));

  return (
    <Button
      label={wornToday ? '✓ Worn today' : 'Worn today'}
      kind={wornToday ? 'secondary' : 'primary'}
      disabled={itemIds.length === 0}
      loading={log.isPending || remove.isPending}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (wornToday) remove.mutate({ itemIds: [...ids], date: today });
        else log.mutate({ itemIds: [...ids], outfitId });
      }}
    />
  );
}
