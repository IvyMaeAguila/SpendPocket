import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseReceiptPreview, type ReceiptSnapshot } from '@/components/expense-receipt-preview';
import { EmptyPouch } from '@/components/empty-pouch';
import { Action, Card, ExpenseRow, Loading, MonthBar, SectionHeader, useScreenData } from '@/components/spend-ui';
import { useTapSound } from '@/components/tap-sound';
import { currencyFor, entriesForMonth, entriesOn, historyData, isDayKey, localDay, monthAt, money } from '@/db/reporting';
import type { ReceiptPeriod } from '@/utils/receipt-details';

export default function History() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  const initialDay = isDayKey(day) ? day : localDay();
  return <CalendarHistory key={initialDay} initialDay={initialDay} />;
}

function CalendarHistory({ initialDay }: { initialDay: string }) {
  const { tap } = useTapSound();
  const db = useSQLiteContext();
  const [offset, setOffset] = useState(() => {
    const initial = new Date(initialDay + 'T12:00:00');
    const now = new Date();
    return (initial.getFullYear() - now.getFullYear()) * 12 + initial.getMonth() - now.getMonth();
  });
  const [day, setDay] = useState(initialDay);
  const [exporting, setExporting] = useState<ReceiptPeriod['kind']>();
  const [receiptError, setReceiptError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptSnapshot>();
  const exportLock = useRef(false);
  const date = monthAt(offset);
  const month = localDay(date).slice(0, 7);
  const selected = day.startsWith(month) ? day : month + '-01';
  // The SQLite connection stays stable for the lifetime of the provider.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const read = useCallback(() => historyData(db, month, selected), [db, month, selected]);
  const { data, failed, refresh } = useScreenData(read);
  const current = data?.selected === selected && data.month === month ? data : undefined;
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const totals = new Map((data?.month === month ? data.totals : []).map(item => [item.day, item.total]));
  const peak = Math.max(1, ...totals.values());
  const pace = data?.month === month ? data.budget / days : 0;
  const monthHasExpenses = totals.size > 0;
  const dayHasExpenses = (current?.entries.length ?? 0) > 0;

  async function readReceipt(period: ReceiptPeriod): Promise<ReceiptSnapshot> {
    const [entries, currency] = await Promise.all([
      period.kind === 'day' ? entriesOn(db, period.key) : entriesForMonth(db, period.key),
      currencyFor(db),
    ]);
    return { period, entries, currency };
  }

  async function viewReceipt(period: ReceiptPeriod) {
    if (exportLock.current) return;
    exportLock.current = true;
    setPreviewLoading(true);
    setReceiptError('');
    try {
      setReceipt(await readReceipt(period));
    } catch {
      setReceiptError('Could not open the receipt. Try again.');
    } finally {
      setPreviewLoading(false);
      exportLock.current = false;
    }
  }

  async function exportReceipt(period: ReceiptPeriod, snapshot?: ReceiptSnapshot) {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(period.kind);
    setReceiptError('');
    try {
      const [{ downloadReceipt }, details] = await Promise.all([
        import('@/utils/expense-receipt'),
        snapshot ?? readReceipt(period),
      ]);
      await downloadReceipt(details.period, details.entries, details.currency);
    } catch {
      setReceiptError('Could not export the receipt. Try again.');
    } finally {
      exportLock.current = false;
      setExporting(undefined);
    }
  }

  return <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
    <FlatList className="bg-page dark:bg-slate-950"
      contentContainerStyle={{ paddingBottom: 120, width: '100%', maxWidth: 540, alignSelf: 'center', gap: 8 }}
      data={current?.entries ?? []} keyExtractor={item => item.id}
      renderItem={({ item }) => <View className="mx-5"><ExpenseRow item={item} currency={current?.currency ?? 'PHP'} onPress={() => router.push({ pathname: '/expense', params: { id: item.id } })} /></View>}
      ListHeaderComponent={<View>
        <SectionHeader title="History"><MonthBar date={date} onChange={delta => setOffset(n => n + delta)} /></SectionHeader>
        <View className="mx-5 -mt-7 gap-4">
        <Card>
          <View className="flex-row flex-wrap">
            {['S','M','T','W','T','F','S'].map((label, index) => <Text key={index} style={{ width: '14.2857%' }} className="mb-2 text-center font-bold text-slate-700 dark:text-slate-200">{label}</Text>)}
            {Array.from({ length: date.getDay() }, (_, i) => <View key={'empty' + i} style={{ width: '14.2857%' }} />)}
            {Array.from({ length: days }, (_, i) => {
              const key = month + '-' + String(i + 1).padStart(2, '0');
              const total = totals.get(key) ?? 0;
              const level = total / peak;
              const fill = total === 0 ? undefined : level <= 0.25 ? '#dceee4' : level <= 0.5 ? '#acd8bf' : level <= 0.75 ? '#78be98' : '#247151';
              const overPace = pace > 0 && total > pace;
              return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: key === selected }}
                accessibilityLabel={key + (total ? ', ' + money(total, data?.currency) : '') + (overPace ? ', above daily budget pace' : '')}
                onPress={() => { tap(); setDay(key); }}
                style={{ width: '14.2857%', minHeight: 44, padding: 2 }}>
                <View className="flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: key === selected ? '#0f4e3c' : fill }}>
                  <Text className={key === selected || level > 0.75 ? 'text-white' : fill ? 'text-slate-900' : 'text-slate-900 dark:text-white'}>{i + 1}</Text>
                  {overPace ? <View className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#ec625e]" /> : null}
                </View>
              </Pressable>;
            })}
          </View>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-full bg-[#e1ebe5]" />
            <Text className="font-sans text-xs text-muted dark:text-slate-300">No spending · Darker days show heavier spending</Text>
          </View>
          {pace > 0 ? <Text className="font-sans text-xs text-muted dark:text-slate-300">Red dot: above daily budget pace ({money(pace, data?.currency)})</Text> : null}
        </Card>
        <View className="flex-row flex-wrap items-baseline justify-between gap-2">
          <Text className="font-bold text-ink dark:text-white">{new Date(selected + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text className="font-bold text-ink dark:text-white">{money(totals.get(selected) ?? 0, data?.currency)}</Text>
        </View>
        </View>
      </View>}
      ListEmptyComponent={<View className="mx-5">{!current || failed ? <Loading failed={failed} retry={refresh} /> : <Card>
        <View className="flex-row items-center gap-4">
          <EmptyPouch size={54} />
          <View className="flex-1 items-start gap-2">
            <Text className="font-bold text-ink dark:text-white">Nothing logged for this day</Text>
            <Text className="font-sans text-sm text-muted dark:text-slate-300">Add one so it shows up in your month.</Text>
            <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-full bg-[#0f4e3c] px-4 active:opacity-75"
              onPress={() => { tap(); router.push({ pathname: '/expense', params: { day: selected } }); }}>
              <Text className="font-bold text-sm text-white">Add expense</Text>
            </Pressable>
          </View>
        </View>
      </Card>}</View>}
      ListFooterComponent={current && !failed ? <View className="mx-5 mt-2 gap-2">
        {monthHasExpenses ? <View className="gap-2">
          <Text className="font-bold text-ink dark:text-white">Expense receipts</Text>
          <View className="flex-row flex-wrap gap-2">
            <Action label="View day receipt" disabled={previewLoading || !!exporting || !dayHasExpenses}
              onPress={() => void viewReceipt({ kind: 'day', key: selected })} />
            <Action label="View month receipt" disabled={previewLoading || !!exporting}
              onPress={() => void viewReceipt({ kind: 'month', key: month })} />
          </View>
          <View className="flex-row flex-wrap gap-2">
          <Action label={exporting === 'day' ? 'Preparing day…' : 'Download day PDF'} selected={false} disabled={previewLoading || !!exporting || !dayHasExpenses}
            onPress={() => void exportReceipt({ kind: 'day', key: selected })} />
          <Action label={exporting === 'month' ? 'Preparing month…' : 'Download month PDF'} selected={false} disabled={previewLoading || !!exporting}
            onPress={() => void exportReceipt({ kind: 'month', key: month })} />
          </View>
        </View> : <View className="flex-row items-center justify-between gap-3 px-1">
          <Text className="flex-1 font-sans text-sm text-muted dark:text-slate-300">PDF receipts unlock after your first expense this month.</Text>
          <Pressable accessibilityRole="button" disabled accessibilityState={{ disabled: true }} className="min-h-11 justify-center rounded-full bg-[#e1ebe5] px-4 dark:bg-slate-800">
            <Text className="font-semibold text-sm text-muted dark:text-slate-300">Export PDF</Text>
          </Pressable>
        </View>}
        {receiptError ? <Text accessibilityLiveRegion="polite" className="font-sans text-red-700 dark:text-red-300">{receiptError}</Text> : null}
      </View> : undefined}
    />
    {receipt ? <ExpenseReceiptPreview receipt={receipt} downloading={!!exporting} error={receiptError}
      close={() => { setReceipt(undefined); setReceiptError(''); }}
      download={() => void exportReceipt(receipt.period, receipt)} /> : null}
  </SafeAreaView>;
}
