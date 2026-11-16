import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTapSound } from '@/components/tap-sound';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { Action, Body, Card, ExpenseRow, Loading, MonthBar, Screen, useScreenData } from '@/components/spend-ui';
import { biggest, currencyFor, daily, entriesForMonth, groups, localDay, monthAt, money } from '@/db/reporting';

const expensePageSize = 30;

export default function Summary() {
  const db = useSQLiteContext();
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [expenseLimit, setExpenseLimit] = useState(expensePageSize);
  const { tap } = useTapSound();
  const date = monthAt(offset);
  const month = localDay(date).slice(0, 7);
  const previous = localDay(monthAt(offset - 1)).slice(0, 7);
  const read = useCallback(async () => {
    const [categories, prior, days, top, currency] = await Promise.all([
      groups(db, month), groups(db, previous), daily(db, month), biggest(db, month), currencyFor(db),
    ]);
    return { month, categories, prior, days, top, currency };
  }, [db, month, previous]);
  const filterRead = useCallback(() => selectedId
    ? entriesForMonth(db, month, selectedId, expenseLimit + 1).then(rows => ({ month, selectedId, rows, limit: expenseLimit }))
    : Promise.resolve(undefined), [db, month, selectedId, expenseLimit]);
  const { data, failed, refresh } = useScreenData(read);
  const filtered = useScreenData(filterRead);
  const current = data?.month === month ? data : undefined;
  const matching = filtered.data?.month === month && filtered.data.selectedId === selectedId ? filtered.data : undefined;
  const peak = Math.max(1, ...(current?.days.map(day => day.total) ?? []));
  const leader = current?.categories[0];
  const priorTotal = current?.prior.find(item => item.id === leader?.id)?.total;
  const change = priorTotal && leader ? Math.round((leader.total - priorTotal) / priorTotal * 100) : undefined;
  const spotlight = current?.top[0];
  return <Screen title="Summary" header={<MonthBar date={date} onChange={delta => { setSelectedId(undefined); setExpenseLimit(expensePageSize); setOffset(n => n + delta); }} />}>
    {!current || failed ? <Loading failed={failed} retry={refresh} /> : <>
      {current.categories.length ? <>
        <CategoryBreakdown categories={current.categories} currency={current.currency} selectedId={selectedId}
          onSelect={id => { tap(); setSelectedId(id); setExpenseLimit(expensePageSize); }} />
        {selectedId ? <Card>
          <Text className="font-bold text-ink dark:text-white">{current.categories.find(item => item.id === selectedId)?.name ?? 'Category'} expenses</Text>
          {matching && !filtered.failed
            ? <>
              {matching.rows.slice(0, matching.limit).map(item => <ExpenseRow key={item.id} item={item} currency={current.currency} />)}
              {matching.rows.length > matching.limit ? <Action label={matching.limit < expenseLimit ? 'Loading…' : 'Show more expenses'}
                disabled={matching.limit < expenseLimit} selected={false} onPress={() => setExpenseLimit(limit => limit + expensePageSize)} /> : null}
            </>
            : <Loading failed={filtered.failed} retry={filtered.refresh} />}
        </Card> : null}
        {leader && change !== undefined ? <Card>
          <Text className="font-bold text-ink dark:text-white">{leader.name} compared with last month</Text>
          <Text className="font-semibold text-sm text-muted dark:text-slate-300">{change === 0 ? 'No change' : (change > 0 ? '↑ ' : '↓ ') + Math.abs(change) + '%'}</Text>
        </Card> : null}
        {spotlight ? <View className="gap-1 rounded-3xl bg-[#eee8fa] p-5 dark:bg-slate-900">
          <Text className="font-semibold text-sm text-[#4e3977] dark:text-slate-300">Biggest expense this month</Text>
          <Text className="font-bold text-2xl text-[#36245e] dark:text-white">{money(spotlight.amount, current.currency)}</Text>
          <Text className="font-sans text-sm text-[#4e3977] dark:text-slate-300">{spotlight.name} · {new Date(spotlight.day + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</Text>
        </View> : null}
        <Card>
          <Text className="font-bold text-ink dark:text-white">Daily spending</Text>
          <View className="h-28 flex-row items-end gap-0.5">
            {Array.from({ length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() }, (_, index) => {
              const day = month + '-' + String(index + 1).padStart(2, '0');
              const total = current.days.find(item => item.day === day)?.total ?? 0;
              return <Pressable key={day} accessibilityRole="button" accessibilityLabel={'View spending for ' + day + ', ' + money(total, current.currency)}
                onPress={() => { tap(); router.navigate({ pathname: '/history', params: { day } }); }}
                className="h-full flex-1 justify-end active:opacity-60">
                <View className="rounded-t bg-[#39946c]" style={{ height: total ? Math.max(5, 108 * total / peak) : 3, opacity: total ? 1 : 0.22 }} />
              </Pressable>;
            })}
          </View>
          <Text className="font-sans text-sm text-muted dark:text-slate-300">One bar per day. Tap a bar to see that day.</Text>
        </Card>
        <Card><Body>Biggest expenses</Body>{current.top.map(item => <ExpenseRow key={item.id} item={item} currency={current.currency} />)}</Card>
      </> : <EmptySummary currency={current.currency} onAdd={() => { tap(); router.push('/expense'); }} />}
    </>}
  </Screen>;
}


function EmptySummary({ currency, onAdd }: { currency: string; onAdd: () => void }) {
  return <>
    <Card>
      <Text className="font-bold text-ink dark:text-white">Spending by category</Text>
      <View className="h-36 items-center justify-center">
        <Svg width={126} height={126} viewBox="0 0 126 126" style={{ position: 'absolute' }}>
          <Circle cx={63} cy={63} r={50} stroke="#cddfd3" strokeWidth={13}
            strokeDasharray="3 6" strokeLinecap="round" fill="none" />
        </Svg>
        <Text className="font-bold text-2xl text-ink dark:text-white">{new Intl.NumberFormat('en-PH', {
          style: 'currency', currency, maximumFractionDigits: 0,
        }).format(0)}</Text>
        <Text className="font-sans text-xs text-muted dark:text-slate-300">spent</Text>
      </View>
      <Text className="text-center font-sans text-sm text-muted dark:text-slate-300">Your category breakdown appears here after your first expense.</Text>
    </Card>
    <Card>
      <Text className="font-bold text-ink dark:text-white">Daily spending</Text>
      <View className="h-14 flex-row items-end gap-1.5">
        {[10, 23, 15, 35, 19, 43, 14, 28, 17, 39].map((height, index) =>
          <View key={index} className="flex-1 rounded-t-md bg-[#e1ebe5] dark:bg-slate-700" style={{ height }} />)}
      </View>
      <Text className="font-sans text-sm text-muted dark:text-slate-300">One bar per day once you log an expense.</Text>
    </Card>
    <Pressable accessibilityRole="button" accessibilityLabel="Add your first expense" className="min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-[#0f4e3c] active:opacity-75" onPress={onAdd}>
      <Text className="font-bold text-xl text-lime-400">+</Text>
      <Text className="font-bold text-base text-white">Add your first expense</Text>
    </Pressable>
  </>;
}
