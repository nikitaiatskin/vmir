/** Cool-off timer rules (SPEC §5 Cool-off, US-4.1 – US-4.4). */

const DAY = 24 * 60 * 60 * 1000;

export const REMINDER_HOUR = 18;

/** Whole days left until the decision, rounded up; 0 when due. */
export function daysLeft(decideAt: string | Date, now: Date = new Date()): number {
  const ms = new Date(decideAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY);
}

export function isDue(decideAt: string | Date, now: Date = new Date()) {
  return new Date(decideAt).getTime() <= now.getTime();
}

export function countdownLabel(decideAt: string | Date, now: Date = new Date()) {
  const d = daysLeft(decideAt, now);
  if (d === 0) return 'Decide now';
  return d === 1 ? '1 day left' : `${d} days left`;
}

/**
 * When to remind: 18:00 local time on the day of decide_at.
 * If decide_at is after 18:00, remind at decide_at itself. Null if that moment has passed.
 */
export function reminderDate(decideAt: string | Date, now: Date = new Date()): Date | null {
  const at = new Date(decideAt);
  const evening = new Date(at);
  evening.setHours(REMINDER_HOUR, 0, 0, 0);
  const when = evening.getTime() >= at.getTime() ? evening : at;
  return when.getTime() > now.getTime() ? when : null;
}

type WishLike = { price_cents: number | null; decision: 'bought' | 'skipped' | null };

/** Money saved = prices of skipped wishes (US-4.4). */
export function moneySaved(wishes: readonly WishLike[]) {
  return wishes.reduce((sum, w) => sum + (w.decision === 'skipped' ? (w.price_cents ?? 0) : 0), 0);
}
