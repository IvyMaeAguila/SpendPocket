import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { CategoryBadge } from '@/components/category-tile';
import { BudgetRing } from '@/components/budget-ring';
import { Action, Body, Card, Loading, MonthBar, Screen, useScreenData } from '@/components/spend-ui';
import { budgets, currencyFor, localDay, minor, monthAt, money, saveBudget, type Budget } from '@/db/reporting';

export default function Budgets() {
  const db = useSQLiteContext();
  const [offset, setOffset] = useState(0);
  const date = monthAt(offset);
  const month = localDay(date).slice(0, 7);
  const read = useCallback(async () => ({ rows: await budgets(db, month), currency: await currencyFor(db), month }), [db, month]);
  const { data, failed, refresh } = useScreenData(read);
  const current = data?.month === month ? data : undefined;
  return <Screen title="Budgets" header={<MonthBar date={date} onChange={delta => setOffset(n => n + delta)} />}>
    {!current || failed ? <Loading failed={failed} retry={refresh} /> : <>
      <Card>
        <Text className="font-bold text-ink dark:text-white">Monthly overview</Text>
        <View className="flex-row flex-wrap gap-6">
          <View className="gap-1">
            <Text className="font-sans text-xs text-muted dark:text-slate-300">Spent</Text>
            <Text className="font-bold text-xl text-ink dark:text-white">{money(current.rows.reduce((sum, item) => sum + item.spent, 0), current.currency)}</Text>
          </View>
          <View className="gap-1">
            <Text className="font-sans text-xs text-muted dark:text-slate-300">Budgeted</Text>
            <Text className="font-bold text-xl text-ink dark:text-white">{money(current.rows.reduce((sum, item) => sum + (item.limit_amount ?? 0), 0), current.currency)}</Text>
          </View>
        </View>
      </Card>
      {current.rows.some(item => item.limit_amount) ? <Card>
        <Text className="font-bold text-ink dark:text-white">Category budget rings</Text>
        <View className="flex-row flex-wrap gap-3">
          {current.rows.filter(item => item.limit_amount).map(item => <BudgetRing key={item.id} budget={item} />)}
        </View>
        <Text className="font-sans text-xs text-muted dark:text-slate-300">Green: on track · Amber: nearing limit · Red: limit reached</Text>
      </Card> : null}
      {current.rows.map(item => <BudgetCard key={month + item.id + item.limit_amount} item={item} currency={current.currency}
        save={async amount => { await saveBudget(db, item.id, month, amount); refresh(); }} />)}
    </>}
  </Screen>;
}

function BudgetCard({ item, currency, save }: { item: Budget; currency: string; save: (value: number) => Promise<void> }) {
  const [raw, setRaw] = useState(item.limit_amount ? (item.limit_amount / 100).toFixed(2) : '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const limit = item.limit_amount ?? 0;
  const ratio = limit ? item.spent / limit : 0;
  const color = ratio >= 1 ? '#dc2626' : ratio >= 0.7 ? '#d97706' : '#39946c';

  async function commit(amount: number) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try { await save(amount); }
    catch { setError('Could not save this limit. Try again.'); }
    finally { lock.current = false; setPending(false); }
  }

  return <Card>
    <View className="flex-row items-center gap-3">
      <CategoryBadge category={item} size={40} />
      <Text className="flex-1 font-bold text-ink dark:text-white">{item.name}</Text>
    </View>
    <Body>{money(item.spent, currency)}{limit ? ' of ' + money(limit, currency) : ' spent'}</Body>
    {limit ? <>
      <View className="flex-row gap-1" accessibilityLabel={Math.round(ratio * 100) + '% of budget used'}>
        {Array.from({ length: 10 }, (_, i) => <View key={i} className="h-2 flex-1 rounded-full"
          style={{ backgroundColor: i < Math.round(ratio * 10) ? color : '#dbe8e0' }} />)}
      </View>
      <Body>{money(Math.abs(limit - item.spent), currency)} {item.spent > limit ? 'over' : 'left'}</Body>
    </> : <Body>No monthly limit.</Body>}
    <TextInput accessibilityLabel={item.name + ' monthly limit'} keyboardType="decimal-pad" placeholder="Monthly limit" placeholderTextColor="#64748b"
      value={raw} onChangeText={setRaw} className="font-sans min-h-11 rounded-xl border border-slate-300 px-3 text-slate-900 dark:text-white" />
    {error ? <Body>{error}</Body> : null}
    <Action label="Save limit" disabled={pending} onPress={() => {
      const amount = minor(raw);
      if (amount) void commit(amount);
      else setError('Enter a positive monthly limit.');
    }} />
    {limit ? <Action label="Remove limit" selected={false} disabled={pending} onPress={() => void commit(0)} /> : null}
  </Card>;
}
