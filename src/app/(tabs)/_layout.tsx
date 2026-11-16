import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAppearancePreference } from '@/components/appearance';
import { useTapSound } from '@/components/tap-sound';

const routes = [
  ['index', 'Today', 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6'],
  ['history', 'History', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3 10h18M8 3v4m8-4v4'],
  ['summary', 'Summary', 'M11 3a9 9 0 1 0 10 10H11V3Zm4 0v6h6a7 7 0 0 0-6-6Z'],
  ['budgets', 'Budgets', 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 5h18m-5 5h2'],
] as const;

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function NavigationBar({ state, emitter, navigateToTab }: TabBarProps) {
  const { tap } = useTapSound();
  const { dark } = useAppearancePreference();
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(12, (width - 510) / 2);

  function tab([name, label, path]: (typeof routes)[number]) {
    const route = state.routes.find(entry => entry.name === name);
    if (!route) return null;
    const selected = state.routes[state.index].key === route.key;
    return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
      onPress={() => {
        tap();
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!selected && !event.defaultPrevented) navigateToTab(route.key);
      }}
      className="min-h-12 flex-1 items-center justify-center gap-1 active:opacity-60">
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d={path} fill="none" stroke={selected ? (dark ? '#def3a8' : '#17654e') : (dark ? '#a6bcb2' : '#697c74')} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text numberOfLines={1} className={selected ? 'font-bold text-[11px] text-[#17654e] dark:text-[#def3a8]' : 'font-sans text-[11px] text-muted dark:text-slate-300'}>{label}</Text>
    </Pressable>;
  }

  return <View accessibilityRole="tablist"
    className="absolute flex-row items-center rounded-full border border-[#e1ebe6] bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
    style={{ bottom: bottom + 10, left: side, right: side, minHeight: 62, elevation: 8, boxShadow: '0px 8px 24px rgba(19, 65, 49, 0.16)' }}>
    {routes.slice(0, 2).map(tab)}
    <Pressable accessibilityRole="button" accessibilityLabel="Add expense"
      className="-mt-5 h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#0f4e3c] active:opacity-80 dark:border-slate-900"
      style={{ elevation: 7, boxShadow: '0px 4px 10px rgba(19, 65, 49, 0.25)' }}
      onPress={() => { tap(); router.push('/expense'); }}>
      <Svg width={23} height={23} viewBox="0 0 24 24">
        <Path d="M12 5v14M5 12h14" stroke="#d9f78f" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Pressable>
    {routes.slice(2).map(tab)}
  </View>;
}

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false }} tabBar={props => <NavigationBar {...props} />}>
    {routes.map(([name, title]) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
