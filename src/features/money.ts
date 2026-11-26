/** Parses user input like "49,99", "€ 49.99", "1 299" into cents. Returns null for empty or invalid. */
export function parsePriceToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  let s = input.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  // A separator followed by exactly 1–2 digits is the decimal separator; others are thousands.
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2) {
    s = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const value = Number(s);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return Math.round(value * 100);
}

export function formatMoney(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents == null) return '—';
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** Finds the most likely product price in OCR lines, e.g. "€49.99" or "49,99 €". */
export function findPriceInText(
  lines: readonly string[],
): { cents: number; currency: string } | null {
  const symbols: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP', Kč: 'CZK' };
  const re =
    /(€|\$|£|EUR|USD|GBP|CZK|Kč)?\s?(\d{1,5}(?:[ .,]\d{3})*(?:[.,]\d{1,2})?)\s?(€|\$|£|EUR|USD|GBP|CZK|Kč)?/;
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;
    const cur = m[1] ?? m[3];
    if (!cur) continue; // a number without currency is probably not a price
    const cents = parsePriceToCents(m[2]);
    if (cents == null || cents === 0) continue;
    return { cents, currency: symbols[cur] ?? cur };
  }
  return null;
}
