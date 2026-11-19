import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, Text } from 'react-native';

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!imageReady || !laidOut) return;
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;

    async function revealApp() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => true);
      if (!active) return;
      await SplashScreen.hideAsync().catch(() => {});
      if (!active) return;
      if (reduceMotion) {
        setVisible(false);
        return;
      }
      animation = Animated.sequence([
        Animated.timing(lift, {
          toValue: 1, duration: 420, easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(180),
        Animated.timing(opacity, {
          toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      animation.start(({ finished }) => {
        if (active && finished) setVisible(false);
      });
    }

    void revealApp();
    return () => { active = false; animation?.stop(); };
  }, [imageReady, laidOut, lift, opacity]);

  if (!visible) return null;
  return <Animated.View
    testID="launch-screen"
    accessibilityLabel="Opening Spend Pocket"
    accessibilityRole="progressbar"
    onLayout={() => setLaidOut(true)}
    style={[styles.screen, { opacity }]}
  >
    <Animated.View style={{
      alignItems: 'center',
      transform: [
        { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
        { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
      ],
    }}>
      <Image source={require('../../assets/images/splash-icon.png')}
        style={styles.logo} resizeMode="contain"
        onLoadEnd={() => setImageReady(true)} accessibilityIgnoresInvertColors />
      <Text style={styles.name}>Spend Pocket</Text>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100,
    backgroundColor: '#fafcf7', alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: 220, height: 220 },
  name: { color: '#135540', fontFamily: 'Roboto_700Bold', fontSize: 26 },
});
