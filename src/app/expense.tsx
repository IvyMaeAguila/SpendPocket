import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Check from 'lucide-react-native/icons/check';
import Pencil from 'lucide-react-native/icons/pencil';
import X from 'lucide-react-native/icons/x';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryTile } from '@/components/category-tile';
import { Action, Body, Card, Loading, Screen, useScreenData } from '@/components/spend-ui';
import { useTapSound } from '@/components/tap-sound';
import { addExpense, getCategories } from '@/db/expenses';
import { currencyFor, isDayKey, localDay, minor, removeExpense, restoreExpense, updateExpense, type Entry } from '@/db/reporting';

const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
const field = 'font-sans min-h-11 rounded-xl border border-slate-300 px-3 text-slate-900 dark:text-white';

export default function ExpenseScreen() {
  const { id, category, day } = useLocalSearchParams<{ id?: string; category?: string; day?: string }>();
  const db = useSQLiteContext();
  const read = useCallback(async () => {
    const [categories, currency, item] = await Promise.all([
      getCategories(db), currencyFor(db),
      id ? db.getFirstAsync<Entry>('SELECT * FROM expenses WHERE id=?', id) : null,
    ]);
    return { categories, currency, item };
  }, [db, id]);
  const { data, failed, refresh } = useScreenData(read);
  const title = id ? 'Edit expense' : 'Add expense';
  if (!data || failed) return <Screen title={title}><Loading failed={failed} retry={refresh} /></Screen>;
  if (id && !data.item) return <Screen title={title}><Card>
    <Body>Expense unavailable.</Body><Action label="Back" onPress={close} />
  </Card></Screen>;
  return <ExpenseForm key={id ?? (category ?? 'new') + (day ?? '')} {...data} initialCategory={category} initialDay={isDayKey(day) ? day : undefined} />;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function ExpenseForm({ item, categories, currency, initialCategory, initialDay }: {
  item: Entry | null; categories: Awaited<ReturnType<typeof getCategories>>; currency: string; initialCategory?: string; initialDay?: string;
}) {
  const db = useSQLiteContext();
  const { tap, expenseSaved } = useTapSound();
  const { top } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const keyHeight = compact ? 48 : Math.min(84, height * 0.094);
  const shortcutWidth = Math.max(46, (Math.min(width, 540) - 72) / 5);
  const [editing, setEditing] = useState<'date' | 'note'>();
  const [raw, setRaw] = useState(item ? (item.amount / 100).toFixed(2) : '');
  const [category, setCategory] = useState(item?.category_id ?? initialCategory ?? '');
  const [day, setDay] = useState(item?.day ?? initialDay ?? localDay());
  const [note, setNote] = useState(item?.note ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!deleted || pending || error) return;
    const timeout = setTimeout(() => { if (!lock.current) close(); }, 5000);
    return () => clearTimeout(timeout);
  }, [deleted, pending, error]);

  async function write(task: () => Promise<unknown>, done: () => void) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      await task();
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      done();
    } catch {
      setError('Could not update your expense. Try again.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  function save() {
    const amount = minor(raw);
    const date = new Date(day + 'T12:00:00');
    if (!amount || !categories.some(c => c.id === category) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || localDay(date) !== day) {
      setError('Enter a positive amount, choose a category, and enter a valid date.');
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    const when = day === item?.day ? new Date(item.spent_at) : day === localDay() ? new Date() : date;
    void write(() => item ? updateExpense(db, item.id, amount, category, note, day, when.toISOString()) : addExpense(db, amount, category, note, when), () => {
      if (!item) expenseSaved();
      close();
    });
  }

  const title = item ? 'Edit expense' : 'Add expense';
  if (deleted && item) return <Screen title={title}><Card>
    <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-[#173b30] px-4 py-1">
      <Text accessibilityLiveRegion="polite" className="flex-1 font-semibold text-white">Expense deleted</Text>
      <Pressable accessibilityRole="button" disabled={pending} className="min-h-11 justify-center px-2 active:opacity-70"
        onPress={() => { tap(); void write(() => restoreExpense(db, item), close); }}>
        <Text className="font-bold text-lime-400">Undo</Text>
      </Pressable>
    </View>
    {error ? <Body>{error}</Body> : null}
    <Action label="Done" disabled={pending} onPress={close} />
  </Card></Screen>;

  const symbol = new Intl.NumberFormat('en-PH', { style: 'currency', currency })
    .formatToParts(0).find(part => part.type === 'currency')?.value ?? currency + ' ';
  const [whole, fraction] = raw.split('.');
  const displayWhole = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const date = new Date(day + 'T12:00:00');
  const today = day === localDay();
  const shortDate = Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : 'Choose date';

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }} className="bg-page dark:bg-slate-950">
    <ScrollView automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} keyboardShouldPersistTaps="handled" className="flex-1"
      contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
      <View className="bg-[#135540] px-5" style={{ paddingTop: top + (compact ? 12 : 16), paddingBottom: compact ? 32 : 48 }}>
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" disabled={pending}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
            onPress={() => { tap(); close(); }}>
            <X size={19} color="#e5f5eb" />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-lg text-white">{title}</Text>
          <View className="w-11" />
        </View>
        <Text className="mt-4 text-center font-sans text-sm text-[#d9eee3]">Amount · {currency}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={symbol + displayWhole + '.' + (fraction ?? '').padEnd(2, '0')}
          className="text-center font-bold text-5xl text-white">
          {symbol}{displayWhole}<Text className="text-[#a4c9bc]">.{fraction ?? ''}</Text>
          {fraction === undefined ? <Text className="text-[#a4c9bc]">00</Text> : null}
        </Text>
        <View className="mt-3 flex-row flex-wrap justify-center gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Change expense date"
            className="min-h-11 flex-row items-center gap-2 rounded-full bg-white/15 px-4 active:opacity-70"
            onPress={() => { tap(); setEditing(editing === 'date' ? undefined : 'date'); }}>
            <CalendarDays size={15} color="#e5f5eb" />
            <Text className="font-semibold text-sm text-white">{today ? 'Today, ' : ''}{shortDate}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit expense note"
            className="min-h-11 max-w-[48%] flex-row items-center gap-2 rounded-full bg-white/15 px-4 active:opacity-70"
            onPress={() => { tap(); setEditing(editing === 'note' ? undefined : 'note'); }}>
            <Pencil size={15} color="#e5f5eb" />
            <Text numberOfLines={1} className="shrink font-semibold text-sm text-white">{note || 'Add note'}</Text>
          </Pressable>
        </View>
      </View>
      <View className="-mt-6 flex-1 gap-3 rounded-t-[30px] bg-white px-5 pb-5 pt-5 dark:bg-slate-900">
        {editing ? <View className="gap-2 rounded-2xl bg-page p-3 dark:bg-slate-800">
          <Text className="font-semibold text-sm text-ink dark:text-white">{editing === 'date' ? 'Date (YYYY-MM-DD)' : 'Optional note'}</Text>
          <TextInput key={editing} autoFocus accessibilityLabel={editing === 'date' ? 'Expense date' : 'Optional note'}
            value={editing === 'date' ? day : note} onChangeText={editing === 'date' ? setDay : setNote}
            placeholder={editing === 'date' ? 'YYYY-MM-DD' : 'Optional note'} placeholderTextColor="#64748b"
            maxLength={editing === 'date' ? 10 : undefined} onSubmitEditing={() => setEditing(undefined)} className={field} />
          <View className="self-end"><Action label="Done" selected={false} onPress={() => setEditing(undefined)} /></View>
        </View> : null}
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-bold text-ink dark:text-white">Category</Text>
          {categories.length > 5 ? <Text className="font-sans text-xs text-muted dark:text-slate-300">Swipe for more</Text> : null}
        </View>
        <ScrollView horizontal keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingTop: 3, paddingBottom: 5, gap: 8 }}>
          {categories.map(item => <CategoryTile key={item.id} category={item} width={shortcutWidth}
            selected={category === item.id} onPress={() => setCategory(item.id)} />)}
        </ScrollView>
        <View className="mt-1 flex-row flex-wrap">
          {keys.map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={key}
            style={{ height: keyHeight }} className="w-1/3 items-center justify-center rounded-2xl active:bg-mint-100 dark:active:bg-slate-800"
            onPress={() => {
              tap();
              setRaw(value => {
                const next = value + key;
                return key === '⌫' ? value.slice(0, -1) : /^\d{0,8}(\.\d{0,2})?$/.test(next) ? next : value;
              });
            }}>
            <Text className="font-semibold text-2xl text-ink dark:text-white">{key}</Text>
          </Pressable>)}
        </View>
        {error ? <Text accessibilityLiveRegion="polite" className="font-sans text-red-700 dark:text-red-300">{error}</Text> : null}
        <View className="mt-auto gap-2 pt-2">
          <Pressable accessibilityRole="button" disabled={pending}
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-[#0f4e3c] px-4 active:opacity-75 disabled:opacity-45"
            onPress={() => { tap(); save(); }}>
            <Check size={19} color="#d9f78f" />
            <Text className="font-bold text-white">{pending ? 'Saving…' : 'Save expense'}</Text>
          </Pressable>
          {item ? <Action label={confirm ? 'Confirm delete' : 'Delete expense'} disabled={pending} selected={false}
            onPress={() => confirm ? void write(() => removeExpense(db, item.id), () => setDeleted(true)) : setConfirm(true)} /> : null}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
