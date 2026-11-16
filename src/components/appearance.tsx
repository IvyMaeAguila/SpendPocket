import { useSQLiteContext } from 'expo-sqlite';
import { colorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type AppearancePreference = 'system' | 'light' | 'dark';

const AppearanceContext = createContext<{
  preference: AppearancePreference;
  dark: boolean;
  changeAppearance: (next: AppearancePreference) => Promise<void>;
}>({ preference: 'system', dark: false, changeAppearance: async () => {} });

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme();
  const [preference, setPreference] = useState<AppearancePreference>();
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';

  useEffect(() => {
    let active = true;
    db.getFirstAsync<{ value: string }>("SELECT value FROM preferences WHERE key = 'appearance'")
      .then(row => {
        if (active) setPreference(row?.value === 'light' || row?.value === 'dark' ? row.value : 'system');
      })
      .catch(() => { if (active) setPreference('system'); });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    if (preference && Platform.OS !== 'web') colorScheme.set(preference);
  }, [preference]);

  useEffect(() => {
    if (Platform.OS === 'web' && preference) {
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }
  }, [dark, preference]);

  async function changeAppearance(next: AppearancePreference) {
    await db.runAsync(
      "INSERT INTO preferences VALUES ('appearance', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      next,
    );
    setPreference(next);
  }

  if (!preference) return null;
  return <AppearanceContext.Provider value={{ preference, dark, changeAppearance }}>{children}</AppearanceContext.Provider>;
}

export function useAppearancePreference() {
  return useContext(AppearanceContext);
}
