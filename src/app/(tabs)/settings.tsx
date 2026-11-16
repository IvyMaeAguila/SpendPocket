import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Action, Body, Card, Loading, Screen, useScreenData } from '@/components/spend-ui';
import { useAppearancePreference } from '@/components/appearance';
import { CategoryBadge } from '@/components/category-tile';
import { categoryIconGroups, categoryIcons, defaultCategoryIcon } from '@/components/category-icon';
import { useTapSound } from '@/components/tap-sound';
import { getCategories, type Category } from '@/db/expenses';
import { allEntries, csvFor, currencyFor, saveCategory, setCurrency } from '@/db/reporting';

const currencies = ['PHP', 'USD', 'EUR', 'GBP', 'SGD', 'AUD'];
const palette = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export default function Settings() {
  const { preference, changeAppearance } = useAppearancePreference();
  const { enabled, ready, changeSound, tap } = useTapSound();
  const db = useSQLiteContext();
  const read = useCallback(async () => ({ categories: await getCategories(db), currency: await currencyFor(db) }), [db]);
  const { data, failed, refresh } = useScreenData(read);
  const [editing, setEditing] = useState<Category | 'new'>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setStatus('');
    try { await work(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not finish. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  }

  async function exportExpenses() {
    const csv = csvFor(await allEntries(db));
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'spend-pocket-expenses.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device.');
      const file = new File(Paths.cache, 'spend-pocket-expenses.csv');
      file.create({ overwrite: true });
      file.write('\uFEFF' + csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    }
    setStatus('CSV prepared.');
  }

  return <Screen title="Settings">
    <Card>
      <Text className="font-bold text-ink dark:text-white">Appearance</Text>
      <View className="flex-row flex-wrap gap-2">
        {(['system', 'light', 'dark'] as const).map(mode =>
          <Action key={mode} label={mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
            selected={preference === mode} disabled={busy}
            onPress={() => void run(() => changeAppearance(mode))} />
        )}
      </View>
    </Card>
    <Card>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1"><Text className="font-bold text-ink dark:text-white">Tap sounds</Text><Text className="font-sans mt-1 text-sm text-muted dark:text-slate-300">Play sounds when you tap or save a new expense.</Text></View>
        <Switch accessibilityLabel="Tap sounds" value={enabled} disabled={!ready || busy}
          trackColor={{ false: '#aebbb0', true: '#80ad87' }} thumbColor={enabled ? '#def3a8' : '#fafcf7'}
          onValueChange={next => void run(() => changeSound(next))} />
      </View>
    </Card>
    {status ? <Body>{status}</Body> : null}
    {!data || failed ? <Loading failed={failed} retry={refresh} /> : <>
      <Card>
        <Text className="font-bold text-ink dark:text-white">Display currency</Text>
        <Text className="font-sans text-sm text-muted dark:text-slate-300">Changes how amounts are displayed. No currency conversion.</Text>
        <View className="flex-row flex-wrap gap-2">
          {currencies.map(code => <Action key={code} label={code} selected={code === data.currency} disabled={busy}
            onPress={() => void run(async () => { await setCurrency(db, code); refresh(); })} />)}
        </View>
      </Card>
      <Card>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-bold text-ink dark:text-white">Categories</Text>
          <Action label="Add category" selected={false} disabled={busy} onPress={() => setEditing('new')} />
        </View>
        {data.categories.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Edit ' + item.name}
          disabled={busy} onPress={() => { tap(); setEditing(item); }}
          className="min-h-11 flex-row items-center gap-3 border-t border-[#e5ece2] active:opacity-60 dark:border-slate-800">
          <CategoryBadge category={item} size={34} />
          <Text className="flex-1 font-semibold text-ink dark:text-white">{item.name}</Text>
          <Text className="font-sans text-xl text-muted dark:text-slate-300">›</Text>
        </Pressable>)}
      </Card>
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => { if (!busy) setEditing(undefined); }}>
        <View className="flex-1 items-center justify-center bg-black/35 px-5">
          <ScrollView keyboardShouldPersistTaps="handled" style={{ width: '100%', maxWidth: 448, maxHeight: '90%', flexGrow: 0 }}>
            {editing ? <CategoryEditor key={editing === 'new' ? editing : editing.id} category={editing === 'new' ? undefined : editing}
              busy={busy} close={() => setEditing(undefined)} save={(name, color, icon) => void run(async () => {
                await saveCategory(db, editing === 'new' ? undefined : editing.id, name, color, icon);
                setEditing(undefined);
                refresh();
              })} /> : null}
            {editing && status ? <View className="mt-2"><Card><Body>{status}</Body></Card></View> : null}
          </ScrollView>
        </View>
      </Modal>
    </>}
    <Card>
      <Text className="font-bold text-ink dark:text-white">Back up your expenses</Text>
      <Text className="font-sans text-sm text-muted dark:text-slate-300">Save a copy of your expenses before uninstalling or clearing app data.</Text>
      <Action label="Export CSV" disabled={busy} onPress={() => void run(exportExpenses)} />
    </Card>
  </Screen>;
}

function CategoryEditor({ category, busy, close, save }: {
  category?: Category; busy: boolean; close: () => void; save: (name: string, color: string, icon: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const { tap } = useTapSound();
  const [icon, setIcon] = useState(category?.icon ?? defaultCategoryIcon);
  const [color, setColor] = useState(category?.color ?? palette[0]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(() => categoryIcons.find(option => option.name === icon)?.group ?? 'Popular');
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const options = categoryIcons.filter(option => words.length > 0
    ? words.every(word => (option.label + ' ' + option.group).toLowerCase().includes(word))
    : option.group === group);
  return <Card>
    <Text accessibilityRole="header" className="text-xl font-bold text-ink dark:text-white">{category ? 'Edit category' : 'New category'}</Text>
    <TextInput value={name} onChangeText={setName} maxLength={40} accessibilityLabel="Category name"
      className="font-sans min-h-11 rounded-xl border border-slate-300 px-3 text-slate-900 dark:text-white" />
    <View className="flex-row flex-wrap gap-2">
      {palette.map((value, i) => <View key={value} className="items-center gap-1">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: value }} />
        <Action label={['Orange', 'Blue', 'Purple', 'Pink', 'Teal', 'Slate'][i]} selected={color === value} onPress={() => setColor(value)} />
      </View>)}
    </View>
    <Text className="font-bold text-ink dark:text-white">Icon</Text>
    <TextInput accessibilityLabel="Search icons" placeholder="Search icons" placeholderTextColor="#607369"
      value={search} onChangeText={setSearch} autoCorrect={false}
      className="font-sans min-h-11 rounded-xl border border-slate-300 px-3 text-ink dark:text-white" />
    {words.length === 0 ? <View className="flex-row flex-wrap gap-2">
      {categoryIconGroups.map(name =>
        <Action key={name} label={name} selected={name === group} onPress={() => setGroup(name)} />)}
    </View> : null}
    {options.length === 0 ? <Body>No matching icons.</Body> : null}
    <View accessibilityRole="radiogroup" accessibilityLabel="Category icon" className="flex-row flex-wrap gap-2">
      {options.map(option => <Pressable key={option.name} accessibilityRole="radio"
        accessibilityLabel={option.label} accessibilityState={{ checked: icon === option.name }}
        disabled={busy} onPress={() => { tap(); setIcon(option.name); }}
        className={icon === option.name
          ? 'h-11 w-11 items-center justify-center'
          : 'h-11 w-11 items-center justify-center active:opacity-70'}>
        <CategoryBadge category={{ id: category?.id ?? '', color, icon: option.name }} size={40} selected={icon === option.name} />
      </Pressable>)}
    </View>
    <Text className="font-sans text-sm text-muted dark:text-slate-300">
      Selected: {categoryIcons.find(option => option.name === icon)?.label ?? 'Other'}
    </Text>
    <Action label="Save category" disabled={busy || !name.trim()} onPress={() => save(name.trim(), color, icon)} />
    <Action label="Cancel" selected={false} disabled={busy} onPress={close} />
  </Card>;
}
