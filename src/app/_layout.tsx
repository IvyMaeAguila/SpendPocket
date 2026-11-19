import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppearanceProvider, useAppearancePreference } from '@/components/appearance';
import { LaunchScreen } from '@/components/launch-screen';
import { TapSoundProvider } from '@/components/tap-sound';
import { migrateDb } from '@/db/schema';
import { appFonts } from '@/utils/font-assets';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { dark } = useAppearancePreference();
  return <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
    <StatusBar barStyle="light-content" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
    </Stack>
    <LaunchScreen />
  </ThemeProvider>;
}

export function ErrorBoundary({ retry }: { retry: () => void }) {
  useEffect(() => { void SplashScreen.hideAsync().catch(() => {}); }, []);
  return <View className="flex-1 items-center justify-center gap-4 p-6">
    <Text className="font-sans">Spend Pocket could not open its local database.</Text>
    <Text accessibilityRole="button" onPress={retry} className="font-sans p-4">Retry</Text>
  </View>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts(appFonts);
  if (!loaded && !error) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#f3f5f4' }} />}>
      <SQLiteProvider databaseName="spendpocket.db" onInit={migrateDb} useSuspense>
        <AppearanceProvider><TapSoundProvider><Navigator /></TapSoundProvider></AppearanceProvider>
      </SQLiteProvider>
    </Suspense>
  </GestureHandlerRootView>;
}
