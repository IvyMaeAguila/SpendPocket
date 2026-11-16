import type { SQLiteDatabase } from 'expo-sqlite';

const categories = [
  ['food', 'Food', 'restaurant', '#f97316'],
  ['transport', 'Transport', 'bus', '#3b82f6'],
  ['bills', 'Bills', 'receipt', '#8b5cf6'],
  ['shopping', 'Shopping', 'bag', '#ec4899'],
  ['health', 'Health', 'heart', '#ef4444'],
  ['other', 'Other', 'ellipsis-horizontal', '#64748b'],
];

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await db.withTransactionAsync(async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (version && version.user_version >= 2) return;

    await db.execAsync('CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
    if (version?.user_version === 1) {
      await db.execAsync('PRAGMA user_version = 2');
      return;
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        category_id TEXT NOT NULL REFERENCES categories(id),
        note TEXT,
        payment_method TEXT,
        spent_at TEXT NOT NULL,
        day TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_day ON expenses(day);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
      CREATE TABLE IF NOT EXISTS budgets (
        category_id TEXT NOT NULL REFERENCES categories(id),
        month TEXT NOT NULL,
        limit_amount INTEGER NOT NULL CHECK (limit_amount > 0),
        PRIMARY KEY (category_id, month)
      );
      CREATE TABLE IF NOT EXISTS recurring (
        id TEXT PRIMARY KEY NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        category_id TEXT NOT NULL REFERENCES categories(id),
        note TEXT,
        frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
        next_due TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    for (const category of categories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, icon, color, updated_at) VALUES (?, ?, ?, ?, ?)',
        [...category, now],
      );
    }
    await db.execAsync('PRAGMA user_version = 2');
  });
}
