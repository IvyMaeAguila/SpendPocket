import type { SQLiteDatabase } from 'expo-sqlite';

export type Category = { id: string; name: string; color: string; icon: string };
export type Expense = { id: string; amount: number; note: string | null; name: string; color: string };

function dayKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-');
}

export function getCategories(db: SQLiteDatabase) {
  return db.getAllAsync<Category>('SELECT id, name, color, icon FROM categories ORDER BY rowid');
}

export function getTodayExpenses(db: SQLiteDatabase) {
  return db.getAllAsync<Expense>(
    `SELECT e.id, e.amount, e.note, c.name, c.color FROM expenses e
     JOIN categories c ON c.id = e.category_id WHERE e.day = ?
     ORDER BY e.spent_at DESC`,
    dayKey(new Date()),
  );
}

export async function addExpense(db: SQLiteDatabase, amount: number, category: string, note: string, now = new Date()) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid amount');

  await db.runAsync(
    `INSERT INTO expenses (id, amount, category_id, note, spent_at, day, updated_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`,
    amount, category, note.trim() || null, now.toISOString(), dayKey(now), now.toISOString(),
  );
}
