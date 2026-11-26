import { findPriceInText, formatMoney, parsePriceToCents } from '@/features/money';

describe('parsePriceToCents', () => {
  it.each([
    ['49.99', 4999],
    ['49,99', 4999],
    ['€ 49.99', 4999],
    ['1 299', 129900],
    ['1.299,50', 129950],
    ['1,299.50', 129950],
    ['89', 8900],
    ['', null],
    ['abc', null],
  ])('%s → %s', (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });
});

describe('formatMoney', () => {
  it('shows a dash for unknown prices', () => {
    expect(formatMoney(null)).toBe('—');
  });
  it('drops decimals for whole amounts', () => {
    expect(formatMoney(8900, 'EUR')).toBe('€89');
    expect(formatMoney(4999, 'EUR')).toBe('€49.99');
  });
});

describe('findPriceInText', () => {
  it('finds a price with a currency', () => {
    expect(findPriceInText(['COS', 'Relaxed wool coat', '€149.00', 'Size'])).toEqual({
      cents: 14900,
      currency: 'EUR',
    });
    expect(findPriceInText(['Zara', '39,95 EUR'])).toEqual({ cents: 3995, currency: 'EUR' });
  });
  it('ignores numbers without a currency', () => {
    expect(findPriceInText(['Size 38', 'Article 0123'])).toBeNull();
  });
});
