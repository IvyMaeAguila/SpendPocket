import { router } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyPouch } from '@/components/empty-pouch';
import SliderHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { CategoryTile } from '@/components/category-tile';
import { Action, Card, ExpenseRow, Loading, useScreenData } from '@/components/spend-ui';
import { useTapSound } from '@/components/tap-sound';
import { addExpense, getCategories } from '@/db/expenses';
import { budgets, currencyFor, dailyBetween, entriesOn, localDay, loggingStreak, money, quickExpenses } from '@/db/reporting';

function shiftDay(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
}

async function readToday(db: SQLiteDatabase, day: string, month: string, weekStart: string, yesterday: string) {
  const [expenses, categories, currency, limits, daily, suggestions, streak] = await Promise.all([
    entriesOn(db, day), getCategories(db), currencyFor(db), budgets(db, month),
    dailyBetween(db, yesterday < weekStart ? yesterday : weekStart, day), quickExpenses(db), loggingStreak(db, day),
  ]);
  const tracked = limits.filter(item => item.limit_amount !== null);
  const totals = new Map(daily.map(item => [item.day, item.total]));
  return {
    day, expenses, categories, currency, totals, suggestions, streak,
    total: totals.get(day) ?? 0,
    yesterdayTotal: totals.get(yesterday) ?? 0,
    limit: tracked.reduce((total, item) => total + (item.limit_amount ?? 0), 0),
    spent: tracked.reduce((total, item) => total + item.spent, 0),
  };
}

export default function Today() {
  const db = useSQLiteContext();
  const { tap, expenseSaved } = useTapSound();
  const [quickPending, setQuickPending] = useState(false);
  const [quickError, setQuickError] = useState(false);
  const quickLock = useRef(false);
  const { top } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const shortcutWidth = Math.max(46, Math.min(74, (Math.min(width, 540) - 72) / 5));
  const now = new Date();
  const day = localDay(now);
  const yesterday = localDay(shiftDay(now, -1));
  const monday = shiftDay(now, -((now.getDay() + 6) % 7));
  const weekStart = localDay(monday);
  const month = day.slice(0, 7);
  // The provider keeps the connection stable across dashboard renders.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const read = useCallback(() => readToday(db, day, month, weekStart, yesterday), [db, day, month, weekStart, yesterday]);

  const { data, failed, refresh } = useScreenData(read);
  const current = data?.day === day ? data : undefined;
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const budgetRatio = current?.limit ? current.spent / current.limit : 0;
  const budgetFill = budgetRatio >= 1 ? '#bc6a65' : budgetRatio >= 0.7 ? '#ab7948' : '#39946c';
  const delta = current ? current.total - current.yesterdayTotal : 0;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(monday, index);
    const key = localDay(date);
    return { key, date, total: current?.totals.get(key) ?? 0 };
  });
  const peak = Math.max(1, ...week.map(item => item.total));
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  async function logSuggestion(item: Awaited<ReturnType<typeof quickExpenses>>[number]) {
    if (quickLock.current) return;
    quickLock.current = true;
    setQuickPending(true);
    setQuickError(false);
    try {
      await addExpense(db, item.amount, item.categoryId, item.note ?? '');
      expenseSaved();
      refresh();
    } catch {
      setQuickError(true);
    } finally {
      quickLock.current = false;
      setQuickPending(false);
    }
  }

  return <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
    <FlatList className="bg-page dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 112, width: '100%', maxWidth: 540, alignSelf: 'center' }}
      data={current?.expenses ?? []} keyExtractor={item => item.id}
      renderItem={({ item }) => <View className="mx-5 mb-2"><ExpenseRow item={item} currency={current?.currency ?? 'PHP'}
        onPress={() => router.push({ pathname: '/expense', params: { id: item.id } })} /></View>}
      ListHeaderComponent={<>
        <View className="rounded-b-[34px] bg-[#135540] px-5 pb-12" style={{ paddingTop: top + 23 }}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="font-sans text-sm text-[#d9eee3]">{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              <Text accessibilityRole="header" className="font-bold text-2xl text-white">{greeting}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings"
              className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
              onPress={() => { tap(); router.navigate('/settings'); }}>
              <SliderHorizontal size={19} color="#e5f5eb" />
            </Pressable>
          </View>
          <Text className="mt-5 font-sans text-sm text-[#d9eee3]">Spent today</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-5xl text-white">
            {current ? money(current.total, current.currency) : '—'}
          </Text>
          {current && (current.total > 0 || current.yesterdayTotal > 0) ? <View className="mt-2 self-start rounded-full bg-white/15 px-3 py-1">
            <Text className="font-semibold text-xs text-[#d9f78f]">
              {delta === 0 ? 'Same as yesterday' : (delta < 0 ? '↓ ' : '↑ ') + money(Math.abs(delta), current.currency) + (delta < 0 ? ' less than yesterday' : ' more than yesterday')}
            </Text>
          </View> : null}
          <View className="mt-5 flex-row items-end gap-2" accessibilityLabel="Spending this week">
            {week.map(item => {
              const today = item.key === day;
              return <View key={item.key} className="flex-1 items-center gap-1.5"
                accessible accessibilityLabel={item.date.toLocaleDateString('en-PH', { weekday: 'long' }) + (item.key > day ? ', upcoming' : ', ' + money(item.total, current?.currency))}>
                <View className="h-11 w-full items-center justify-end">
                  <View className="w-7 max-w-full rounded-lg" style={{
                    height: item.total ? Math.max(8, item.total / peak * 42) : 6,
                    backgroundColor: today ? '#d2f476' : item.key > day ? '#39745f' : '#75a896',
                  }} />
                </View>
                <Text className={today ? 'font-bold text-[10px] text-[#dcf795]' : 'font-sans text-[10px] text-[#d9eee3]'}>
                  {item.date.toLocaleDateString('en-PH', { weekday: 'short' }).slice(0, 1)}
                </Text>
              </View>;
            })}
          </View>
        </View>
        <View className="mx-5 -mt-7"><Card>
          <View className="flex-row flex-wrap items-center justify-between gap-1">
            <Text className="font-bold text-ink dark:text-white">{now.toLocaleDateString('en-PH', { month: 'long' })} budget</Text>
            {current?.limit ? <Text className="font-sans text-xs text-muted dark:text-slate-300">{money(current.spent, current.currency)} of {money(current.limit, current.currency)}</Text> : null}
          </View>
          {current?.limit ? <>
            <View className="flex-row gap-1" accessibilityLabel={Math.round(budgetRatio * 100) + '% of budget used'}>
              {Array.from({ length: 10 }, (_, index) => <View key={index} className="h-2 flex-1 rounded-full"
                style={{ backgroundColor: index < Math.round(budgetRatio * 10) ? budgetFill : '#dbe8e0' }} />)}
            </View>
            <Text className="font-sans text-xs text-muted dark:text-slate-300">
              {money(Math.abs(current.limit - current.spent), current.currency)} {current.spent > current.limit ? 'over' : 'left'} · {daysLeft === 0 ? 'Last day' : daysLeft === 1 ? '1 day to go' : daysLeft + ' days to go'}
            </Text>
          </> : <View className="self-start"><Action label="Set a budget" selected={false} onPress={() => router.navigate('/budgets')} /></View>}
        </Card></View>
        {current?.categories.length ? <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}
          className="mt-4" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 3, paddingBottom: 5, gap: 8 }}>
          {current.categories.map(item => <CategoryTile key={item.id} category={item} width={shortcutWidth}
            onPress={() => router.push({ pathname: '/expense', params: { category: item.id } })} />)}
        </ScrollView> : null}
        {current?.streak ? <View className="mx-5 mt-3 self-start rounded-full bg-[#ffefd4] px-3 py-1.5">
          <Text className="font-semibold text-xs text-[#875517]">🔥 {current.streak}-day logging streak</Text>
        </View> : null}
        {current?.suggestions.length ? <View className="mx-5 mt-4 gap-2">
          <Text className="font-bold text-ink dark:text-white">Quick add</Text>
          <View className="flex-row flex-wrap gap-2">
            {current.suggestions.map(item => <Action key={JSON.stringify([item.categoryId, item.amount, item.note])}
              label={(item.note?.trim().slice(0, 24) || item.name) + ' ' + money(item.amount, current.currency)}
              selected={false} disabled={quickPending} onPress={() => void logSuggestion(item)} />)}
          </View>
          {quickError ? <Text accessibilityLiveRegion="polite" className="font-sans text-red-700 dark:text-red-300">Could not log that expense. Try again.</Text> : null}
        </View> : null}
        <View className="mx-5 mb-2 mt-3 flex-row items-center justify-between">
          <Text accessibilityRole="header" className="font-bold text-xl text-ink dark:text-white">Today</Text>
          <Pressable accessibilityRole="button" className="min-h-11 justify-center px-1 active:opacity-60"
            onPress={() => { tap(); router.navigate('/history'); }}>
            <Text className="font-semibold text-sm text-[#17654e] dark:text-[#def3a8]">See all</Text>
          </Pressable>
        </View>
      </>}
      ListEmptyComponent={<View className="mx-5">{!current || failed
        ? <Loading failed={failed} retry={refresh} />
        : <Card><View className="items-center gap-3 py-1">
          <EmptyPouch size={height < 950 ? 80 : 96} />
          <Text className="font-bold text-lg text-ink dark:text-white">Nothing spent yet</Text>
          <Pressable accessibilityRole="button"
            className="min-h-[48px] items-center justify-center rounded-full bg-[#0f4e3c] px-7 active:opacity-75"
            onPress={() => { tap(); router.push('/expense'); }}>
            <Text className="font-bold text-base text-white">Add first expense</Text>
          </Pressable>
        </View></Card>}</View>}
    />
  </SafeAreaView>;
}
