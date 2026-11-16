const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');
const { receiptSummary } = require('../src/utils/receipt-details.ts');
const { migrateDb } = require('../src/db/schema.ts');
const { addExpense, getCategories } = require('../src/db/expenses.ts');
const {
  budgets, csvFor, currencyFor, daily, entriesForMonth, entriesOn, groups, loggingStreak, minor, quickExpenses, removeExpense,
  restoreExpense, saveBudget, saveCategory, setCurrency, updateExpense,
} = require('../src/db/reporting.ts');

function openDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async sql => sqlite.exec(sql),
    getFirstAsync: async (sql, ...args) => sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => sqlite.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => sqlite.prepare(sql).run(...args.flat()),
    withTransactionAsync: async task => {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { sqlite, db };
}

test('money input uses integer minor units and rejects malformed input', () => {
  for (const [raw, expected] of [['120.50',12050], ['.09',9], ['1.01',101], ['99999999.99',9999999999], ['0',0], ['-2',0], ['1.234',0], ['1e2',0]]) {
    assert.equal(minor(raw), expected, raw);
  }
});

test('migration, CRUD, grouping, budgets, preferences and CSV', async () => {
  const { sqlite, db } = openDatabase();
  try {
    await migrateDb(db);
    assert.equal((await getCategories(db)).length, 6);
    await addExpense(db, 12050, 'food', 'Lunch, "test"', new Date(2026, 10, 30, 23, 59));
    await addExpense(db, 275, 'transport', '', new Date(2026, 11, 1, 0, 1));
    await assert.rejects(addExpense(db, 0, 'food', '', new Date()));
    await assert.rejects(addExpense(db, 20, 'missing', '', new Date()));
    const [item] = await entriesOn(db, '2026-11-30');
    assert.equal(item.amount, 12050);
    assert.deepEqual((await entriesForMonth(db, '2026-11')).map(entry => entry.id), [item.id]);
    assert.deepEqual((await entriesForMonth(db, '2026-12')).map(entry => entry.amount), [275]);
    assert.match(csvFor([item]), /"Lunch, ""test"""/);
    assert.match(csvFor([{ ...item, note: '=1+1' }]), /"'=1\+1"/);
    await updateExpense(db, item.id, 12200, 'food', item.note, item.day, item.spent_at);
    assert.equal((await groups(db, '2026-11'))[0].total, 12200);
    assert.equal((await daily(db, '2026-12'))[0].total, 275);
    await saveBudget(db, 'food', '2026-11', 15000);
    assert.equal((await budgets(db, '2026-11')).find(row => row.id === 'food').limit_amount, 15000);
    assert.equal((await budgets(db, '2026-12')).find(row => row.id === 'food').spent, 0);
    await removeExpense(db, item.id);
    assert.equal((await entriesOn(db, item.day)).length, 0);
    await restoreExpense(db, item);
    assert.equal((await entriesOn(db, item.day))[0].id, item.id);
    await setCurrency(db, 'USD');
    await saveCategory(db, 'food', 'Meals', '#14b8a6', 'coffee');
    await migrateDb(db);
    assert.equal(await currencyFor(db), 'USD');
    assert.equal((await entriesOn(db, item.day))[0].name, 'Meals');
    assert.equal((await entriesOn(db, item.day))[0].icon, 'coffee');
    await saveCategory(db, undefined, 'Gifts', '#8b5cf6', 'gift');
    assert.equal((await getCategories(db)).find(row => row.name === 'Gifts').icon, 'gift');
  } finally { sqlite.close(); }
});

test('version 1 upgrade preserves expenses and reports 5,000 rows correctly', async () => {
  const { sqlite, db } = openDatabase();
  try {
    await migrateDb(db);
    sqlite.exec(`
      DROP TABLE preferences;
      PRAGMA user_version=1;
      WITH RECURSIVE seq(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM seq WHERE n<5000)
      INSERT INTO expenses (id,amount,category_id,spent_at,day,updated_at)
      SELECT CAST(n AS TEXT), 100, 'food', '2026-11-01T12:00:00.000Z', '2026-11-01', '2026-11-01T12:00:00.000Z' FROM seq;
    `);
    await migrateDb(db);
    assert.equal((await daily(db, '2026-11'))[0].total, 500000);
    assert.equal((await entriesOn(db, '2026-11-01')).length, 5000);
    assert.equal((await entriesForMonth(db, '2026-11', 'food', 31)).length, 31);
    assert.equal((await entriesForMonth(db, '2026-11')).length, 5000);
    assert.equal(await currencyFor(db), 'PHP');
  } finally { sqlite.close(); }
});

test('frequent expenses, streaks and category filtering use recorded data', async () => {
  const { sqlite, db } = openDatabase();
  try {
    await migrateDb(db);
    await addExpense(db, 3000, 'food', 'Coffee', new Date(2026, 10, 14, 9));
    await addExpense(db, 3000, 'food', 'Coffee', new Date(2026, 10, 15, 9));
    await addExpense(db, 5000, 'transport', 'Ride', new Date(2026, 10, 15, 10));
    assert.deepEqual((await quickExpenses(db)).map(row => ({ ...row })), [{ categoryId: 'food', amount: 3000, note: 'Coffee', name: 'Food' }]);
    assert.equal(await loggingStreak(db, '2026-11-16'), 2);
    assert.equal(await loggingStreak(db, '2026-11-17'), 0);
    assert.equal((await entriesForMonth(db, '2026-11', 'food')).length, 2);
    const receipt = receiptSummary(await entriesForMonth(db, '2026-11'));
    assert.equal(receipt.total, 11000);
    assert.deepEqual(receipt.categories.map(({ name, amount }) => [name, amount]), [['Food', 6000], ['Transport', 5000]]);
  } finally { sqlite.close(); }
});
