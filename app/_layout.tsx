import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { extractReelUrl } from '../lib/api';
import { drain, enqueue } from '../lib/queue';
import { c } from '../lib/theme';

export default function RootLayout() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    debug: false,
    resetOnBackground: true,
  });
  // Android can redeliver the same intent on resume; without this the same reel
  // gets queued twice.
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent) return;

    const raw = shareIntent?.webUrl ?? shareIntent?.text ?? '';
    const url = extractReelUrl(raw);

    if (!url) {
      Alert.alert(
        'Not a reel link',
        "That share didn't contain an Instagram reel URL.",
      );
      resetShareIntent();
      return;
    }

    if (lastHandled.current === url) {
      resetShareIntent();
      return;
    }
    lastHandled.current = url;

    // Queue first, submit second. The share must survive no signal and a
    // sleeping laptop, so nothing on this path is allowed to depend on network.
    (async () => {
      await enqueue(url);
      resetShareIntent();
      router.replace('/');
      drain().catch(() => {});
    })();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="reel/[id]"
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
      </Stack>
    </>
  );
}
