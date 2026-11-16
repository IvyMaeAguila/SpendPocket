import type { SQLiteDatabase } from 'expo-sqlite';

export function localDay(d = new Date()) {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-');
}

export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return Number.isFinite(date.getTime()) && localDay(date) === value;
}

export function monthAt(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export function minor(raw: string) {
  if (!/^\d{0,8}(\.\d{0,2})?$/.test(raw)) return 0;
  const [whole, fraction = ''] = raw.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export const money = (amount: number, currency = 'PHP') =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount / 100);

export type Entry = {
  id: string; amount: number; note: string | null; category_id: string; payment_method: string | null;
  day: string; spent_at: string; name: string; color: string; icon: string;
};
export type Group = { id: string; icon: string; name: string; color: string; total: number };
export type Daily = { day: string; total: number };
export type Budget = { id: string; icon: string; name: string; color: string; spent: number; limit_amount: number | null };

const entries = 'SELECT e.*, c.name, c.color, c.icon FROM expenses e JOIN categories c ON c.id=e.category_id';

export function entriesOn(db: SQLiteDatabase, day: string) {
  return db.getAllAsync<Entry>(entries + ' WHERE e.day=? ORDER BY e.spent_at DESC', day);
}

export function entriesForMonth(db: SQLiteDatabase, month: string, categoryId?: string, limit = -1) {
  const range = [month + '-01', month + '-31'];
  return db.getAllAsync<Entry>(
    entries + ' WHERE e.day BETWEEN ? AND ?' + (categoryId ? ' AND e.category_id=?' : '') +
    ' ORDER BY e.day, e.spent_at, e.id LIMIT ?',
    ...(categoryId ? [...range, categoryId] : range), limit,
  );
}

export function biggest(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<Entry>(entries + ' WHERE e.day BETWEEN ? AND ? ORDER BY e.amount DESC, e.spent_at DESC LIMIT 5', month + '-01', month + '-31');
}

export function quickExpenses(db: SQLiteDatabase) {
  return db.getAllAsync<{ categoryId: string; amount: number; note: string | null; name: string }>(
    'SELECT e.category_id AS categoryId,e.amount,e.note,c.name FROM expenses e JOIN categories c ON c.id=e.category_id GROUP BY e.category_id,e.amount,e.note HAVING COUNT(*) >= 2 ORDER BY COUNT(*) DESC,MAX(e.spent_at) DESC,e.category_id,e.amount LIMIT 3',
  );
}

export async function loggingStreak(db: SQLiteDatabase, today: string) {
  const row = await db.getFirstAsync<{ total: number }>(`
    WITH RECURSIVE streak(day) AS (
      SELECT candidate.day
      FROM (SELECT CASE WHEN EXISTS (SELECT 1 FROM expenses WHERE day = ?)
                        THEN ? ELSE date(?, '-1 day') END AS day) AS candidate
      WHERE EXISTS (SELECT 1 FROM expenses WHERE day = candidate.day)
      UNION ALL
      SELECT date(streak.day, '-1 day') FROM streak
      WHERE EXISTS (SELECT 1 FROM expenses WHERE day = date(streak.day, '-1 day'))
    )
    SELECT COUNT(*) AS total FROM streak
  `, today, today, today);
  return row?.total ?? 0;
}

export function allEntries(db: SQLiteDatabase) {
  return db.getAllAsync<Entry>(entries + ' ORDER BY e.day DESC, e.spent_at DESC');
}

export function groups(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<Group>(
    'SELECT c.id,c.icon,c.name,c.color,SUM(e.amount) AS total FROM expenses e JOIN categories c ON c.id=e.category_id WHERE e.day BETWEEN ? AND ? GROUP BY c.id ORDER BY total DESC, c.name, c.id',
    month + '-01', month + '-31',
  );
}

export function dailyBetween(db: SQLiteDatabase, start: string, end: string) {
  return db.getAllAsync<Daily>('SELECT day,SUM(amount) AS total FROM expenses WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day', start, end);
}

export function daily(db: SQLiteDatabase, month: string) {
  return dailyBetween(db, month + '-01', month + '-31');
}

export function budgets(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<Budget>(
    'SELECT c.id,c.icon,c.name,c.color,b.limit_amount,COALESCE(SUM(e.amount),0) AS spent FROM categories c LEFT JOIN budgets b ON b.category_id=c.id AND b.month=? LEFT JOIN expenses e ON e.category_id=c.id AND e.day BETWEEN ? AND ? GROUP BY c.id ORDER BY c.rowid',
    month, month + '-01', month + '-31',
  );
}

export async function saveBudget(db: SQLiteDatabase, id: string, month: string, amount: number) {
  if (amount === 0) {
    await db.runAsync('DELETE FROM budgets WHERE category_id=? AND month=?', id, month);
    return;
  }
  await db.runAsync('INSERT INTO budgets (category_id,month,limit_amount) VALUES (?,?,?) ON CONFLICT(category_id,month) DO UPDATE SET limit_amount=excluded.limit_amount', id, month, amount);
}

export async function currencyFor(db: SQLiteDatabase) {
  return (await db.getFirstAsync<{ value: string }>("SELECT value FROM preferences WHERE key='currency'"))?.value ?? 'PHP';
}

export function setCurrency(db: SQLiteDatabase, currency: string) {
  return db.runAsync("INSERT INTO preferences VALUES ('currency',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", currency);
}

export function saveCategory(db: SQLiteDatabase, id: string | undefined, name: string, color: string, icon: string) {
  const now = new Date().toISOString();
  return id
    ? db.runAsync('UPDATE categories SET name=?,color=?,icon=?,updated_at=? WHERE id=?', name, color, icon, now, id)
    : db.runAsync("INSERT INTO categories (id,name,icon,color,updated_at) VALUES (lower(hex(randomblob(16))),?,?,?,?)", name, icon, color, now);
}

export function updateExpense(db: SQLiteDatabase, id: string, amount: number, category: string, note: string, day: string, spentAt: string) {
  return db.runAsync('UPDATE expenses SET amount=?,category_id=?,note=?,day=?,spent_at=?,updated_at=? WHERE id=?', amount, category, note.trim() || null, day, spentAt, new Date().toISOString(), id);
}

export function removeExpense(db: SQLiteDatabase, id: string) {
  return db.runAsync('DELETE FROM expenses WHERE id=?', id);
}

export function restoreExpense(db: SQLiteDatabase, item: Entry) {
  return db.runAsync('INSERT INTO expenses (id,amount,category_id,note,payment_method,spent_at,day,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    item.id, item.amount, item.category_id, item.note, item.payment_method, item.spent_at, item.day, new Date().toISOString());
}

export function csvFor(entries: Entry[]) {
  const cell = (value: string | number) => {
    const text = String(value);
    return '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" : '') + text.replace(/"/g, '""') + '"';
  };
  return ['Date,Amount,Category,Note,Payment method', ...entries.map(item =>
    [item.day, (item.amount / 100).toFixed(2), item.name, item.note ?? '', item.payment_method ?? ''].map(cell).join(',')
  )].join('\r\n') + '\r\n';
}

export async function historyData(db: SQLiteDatabase, month: string, selected: string) {
  const [totals, entries, currency, limits] = await Promise.all([
    daily(db, month), entriesOn(db, selected), currencyFor(db), budgets(db, month),
  ]);
  const budget = limits.reduce((sum, item) => sum + (item.limit_amount ?? 0), 0);
  return { totals, entries, currency, selected, month, budget };
}
