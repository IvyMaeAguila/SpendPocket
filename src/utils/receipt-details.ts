import type { Entry } from '@/db/reporting';

export type ReceiptPeriod = { kind: 'day' | 'month'; key: string };

export function receiptPeriodLabel({ kind, key }: ReceiptPeriod) {
  const date = new Date((kind === 'month' ? key + '-01' : key) + 'T12:00:00');
  return date.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', ...(kind === 'day' ? { day: 'numeric' } : {}),
  });
}

export function receiptSummary(entries: Entry[]) {
  let total = 0;
  const byCategory = new Map<string, { id: string; icon: string; color: string; name: string; amount: number }>();
  for (const entry of entries) {
    total += entry.amount;
    const previous = byCategory.get(entry.category_id);
    byCategory.set(entry.category_id, {
      id: entry.category_id, icon: entry.icon, color: entry.color, name: entry.name,
      amount: (previous?.amount ?? 0) + entry.amount,
    });
  }
  const categories = [...byCategory.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return { total, categories };
}
