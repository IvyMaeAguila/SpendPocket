import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

const SoundContext = createContext({
  enabled: true,
  ready: false,
  tap: () => {},
  expenseSaved: () => {},
  changeSound: async (_enabled: boolean) => {},
});

export function TapSoundProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const player = useAudioPlayer(require('@/assets/tap.wav'));
  const spendingPlayer = useAudioPlayer(require('@/assets/spending.wav'));
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const audible = useRef(false);
  const playRequest = useRef(0);

  useEffect(() => {
    let active = true;
    db.getFirstAsync<{ value: string }>("SELECT value FROM preferences WHERE key = 'tap_sound'")
      .then(row => {
        if (!active) return;
        audible.current = row?.value !== 'off';
        setEnabled(audible.current);
        setReady(true);
      })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [db]);

  function play(sound: typeof player) {
    if (!audible.current) return;
    const request = ++playRequest.current;
    void sound.seekTo(0).then(() => {
      if (audible.current && request === playRequest.current) sound.play();
    }).catch(() => {});
  }

  function tap() {
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
    play(player);
  }

  function expenseSaved() {
    play(spendingPlayer);
  }

  async function changeSound(next: boolean) {
    await db.runAsync(
      "INSERT INTO preferences VALUES ('tap_sound', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      next ? 'on' : 'off',
    );
    audible.current = next;
    setEnabled(next);
    if (next) tap();
    else {
      player.pause();
      spendingPlayer.pause();
    }
  }

  return <SoundContext.Provider value={{ enabled, ready, tap, expenseSaved, changeSound }}>{children}</SoundContext.Provider>;
}

export function useTapSound() {
  return useContext(SoundContext);
}

