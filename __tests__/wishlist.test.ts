import { countdownLabel, daysLeft, isDue, moneySaved, reminderDate } from '@/features/cooloff';
import { matchCheck, scoreLabel } from '@/features/match';

const item = (id: string, category: string, colors: string[], status = 'active') =>
  ({ id, category, colors, status }) as const as {
    id: string;
    category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';
    colors: string[];
    status: 'active' | 'archived';
  };

describe('matchCheck', () => {
  const wardrobe = [
    item('navy-top', 'top', ['#1F2A44']),
    item('navy-top-2', 'top', ['#22304A']),
    item('red-top', 'top', ['#C62828']),
    item('jeans', 'bottom', ['#2F6FD0']),
    item('green-skirt', 'bottom', ['#3E8E4F']),
    item('black-shoes', 'shoes', ['#111111']),
    item('old-top', 'top', ['#1F2A44'], 'archived'),
    item('dress', 'dress', ['#111111']),
  ];

  it('finds similar items of the same category and colour (US-3.3)', () => {
    const r = matchCheck({ category: 'top', colors: ['#1E2943'] }, wardrobe);
    expect(r.similar.map((i) => i.id)).toEqual(['navy-top', 'navy-top-2']);
  });

  it('ignores archived items', () => {
    const r = matchCheck({ category: 'top', colors: ['#1F2A44'] }, wardrobe);
    expect(r.similar.map((i) => i.id)).not.toContain('old-top');
  });

  it('counts items of other categories with compatible colours (US-3.4)', () => {
    const r = matchCheck({ category: 'top', colors: ['#E8833A'] }, wardrobe); // orange top
    // jeans (blue, complementary) and black shoes (neutral); green skirt clashes; dress replaces a top
    expect(r.goesWith.map((i) => i.id).sort()).toEqual(['black-shoes', 'jeans']);
    expect(r.score).toBe(2);
    expect(r.label).toBe('Goes with a few things');
  });

  it('a dress does not "go with" tops or bottoms', () => {
    const r = matchCheck({ category: 'dress', colors: ['#111111'] }, wardrobe);
    expect(r.goesWith.map((i) => i.id)).toEqual(['black-shoes']);
  });
});

it('score labels', () => {
  expect(scoreLabel(0)).toBe("Doesn't match much yet");
  expect(scoreLabel(5)).toBe('Goes with lots of your wardrobe');
});

describe('cool-off', () => {
  const now = new Date('2026-11-26T12:00:00');
  it('counts days left, rounding up', () => {
    expect(daysLeft('2026-12-03T12:00:00', now)).toBe(7);
    expect(daysLeft('2026-11-26T13:00:00', now)).toBe(1);
    expect(daysLeft('2026-11-25T12:00:00', now)).toBe(0);
    expect(isDue('2026-11-26T12:00:00', now)).toBe(true);
    expect(countdownLabel('2026-11-28T12:00:00', now)).toBe('2 days left');
    expect(countdownLabel('2026-11-20T12:00:00', now)).toBe('Decide now');
  });

  it('reminds at 18:00 on the decision day', () => {
    const r = reminderDate('2026-12-03T10:00:00', now)!;
    expect(r.getHours()).toBe(18);
    expect(r.getDate()).toBe(3);
  });

  it('reminds at decide_at when it is later than 18:00, and not in the past', () => {
    expect(reminderDate('2026-12-03T21:30:00', now)!.getHours()).toBe(21);
    expect(reminderDate('2026-11-20T10:00:00', now)).toBeNull();
  });

  it('sums money saved from skipped wishes (US-4.4)', () => {
    expect(
      moneySaved([
        { price_cents: 8900, decision: 'skipped' },
        { price_cents: 5000, decision: 'bought' },
        { price_cents: null, decision: 'skipped' },
        { price_cents: 1000, decision: null },
      ]),
    ).toBe(8900);
  });
});
