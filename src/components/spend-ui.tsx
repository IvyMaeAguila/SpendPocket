import { useFocusEffect } from 'expo-router';
import { CategoryBadge } from '@/components/category-tile';
import { useTapSound } from '@/components/tap-sound';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { money, type Entry } from '@/db/reporting';

export function useScreenData<T>(read: (revision: number) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt(n => n + 1), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setFailed(false);
    read(attempt).then(value => { if (active) setData(value); }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [read, attempt]));
  return { data, failed, refresh };
}

export const serif = 'NotoSerif_700Bold';

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  const { top } = useSafeAreaInsets();
  return <View className="gap-3 rounded-b-[34px] bg-[#135540] px-5 pb-12" style={{ paddingTop: top + 23 }}>
    <Text accessibilityRole="header" className="font-bold text-3xl text-white">{title}</Text>
    {children}
  </View>;
}

export function Screen({ title, header, children }: { title: string; header?: ReactNode; children: ReactNode }) {
  return <SafeAreaView edges={['left', 'right']} style={{ flex: 1 }}>
    <ScrollView className="bg-page dark:bg-slate-950" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 120, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
      <SectionHeader title={title}>{header}</SectionHeader>
      <View className="mx-5 -mt-7 gap-4">{children}</View>
    </ScrollView>
  </SafeAreaView>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-3xl border border-[#dde7db] bg-paper p-5 dark:border-slate-800 dark:bg-slate-900">{children}</View>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text className="font-sans text-base text-ink dark:text-slate-100">{children}</Text>;
}

export function Action({ label, onPress, selected, disabled, icon }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean; icon?: ReactNode }) {
  const { tap } = useTapSound();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled}
    onPress={() => { tap(); onPress(); }}
    className={selected === false ? 'min-h-11 justify-center rounded-xl border border-[#d7e5d5] bg-mint-100 px-4 active:opacity-70 disabled:opacity-50' : 'min-h-11 justify-center rounded-xl bg-lime-400 px-4 active:opacity-70 disabled:opacity-50'}>
    <View className="flex-row items-center justify-center gap-2">
      {icon}
      <Text className="text-center font-semibold text-emerald-950">{label}</Text>
    </View>
  </Pressable>;
}

export function MonthBar({ date, onChange }: { date: Date; onChange: (delta: number) => void }) {
  const { tap } = useTapSound();
  return <View className="flex-row items-center gap-2">
    <Pressable accessibilityRole="button" accessibilityLabel="Previous"
      className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
      onPress={() => { tap(); onChange(-1); }}>
      <ChevronLeft size={19} color="#d9eee3" />
    </Pressable>
    <Text className="flex-1 text-center font-semibold text-white">{date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Next"
      className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
      onPress={() => { tap(); onChange(1); }}>
      <ChevronRight size={19} color="#d9eee3" />
    </Pressable>
  </View>;
}

export function ExpenseRow({ item, currency, onPress }: { item: Entry; currency: string; onPress?: () => void }) {
  const { tap } = useTapSound();
  const time = new Date(item.spent_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const row = <View className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-[#dde7db] bg-paper px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
    <CategoryBadge category={{ id: item.category_id, icon: item.icon, color: item.color }} size={40} />
    <View className="flex-1">
      <Text numberOfLines={1} className="font-semibold text-ink dark:text-white">{item.note || item.name}</Text>
      <Text className="font-sans mt-0.5 text-xs text-muted dark:text-slate-300">{item.name + ' · ' + time}</Text>
    </View>
    <Text className="font-bold text-ink dark:text-white">{money(item.amount, currency)}</Text>
  </View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} className="active:opacity-70">{row}</Pressable> : row;
}

export function Loading({ failed, retry }: { failed: boolean; retry: () => void }) {
  return failed ? <Card><Body>Could not load your data.</Body><Action label="Retry" onPress={retry} /></Card>
    : <View accessibilityLabel="Loading" className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800" />;
}
