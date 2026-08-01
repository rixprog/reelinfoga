import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Label } from '../../components/ui';
import { DEFAULT_BASE_URL, api, getBaseUrl, setBaseUrl } from '../../lib/api';
import { c, radius } from '../../lib/theme';

/**
 * The most important screen for the first week of this app existing.
 *
 * When the phone can't see the laptop — asleep, off the tailnet, wrong URL —
 * every other screen just looks broken. This one turns that into a sentence.
 */
export default function Settings() {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getBaseUrl().then(setUrl);
  }, []);

  async function test() {
    setTesting(true);
    setResult(null);
    await setBaseUrl(url);
    const r = await api.ping(url);
    setResult(
      r.ok
        ? { ok: true, msg: `Connected — ${r.count} reels on the backend` }
        : { ok: false, msg: r.error },
    );
    setTesting(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.h1}>Settings</Text>

        <Label style={{ marginTop: 26 }}>Backend</Label>
        <Card>
          <Text style={s.help}>
            The laptop running the pipeline. Use the Tailscale name — it doesn&apos;t
            change when you switch networks, unlike a wifi IP.
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={DEFAULT_BASE_URL}
            placeholderTextColor={c.textFaint}
            style={s.input}
          />
          <Pressable style={s.button} onPress={test} disabled={testing}>
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.buttonText}>Test connection</Text>
            )}
          </Pressable>
          {result && (
            <View
              style={[
                s.result,
                { backgroundColor: result.ok ? c.greenSoft : c.redSoft },
              ]}
            >
              <Text style={{ color: result.ok ? c.green : c.red, fontSize: 13 }}>
                {result.msg}
              </Text>
            </View>
          )}
          <View style={s.presets}>
            <Pressable style={s.preset} onPress={() => setUrl(DEFAULT_BASE_URL)}>
              <Text style={s.presetText}>Tailscale</Text>
            </Pressable>
            {/* While the phone is plugged in, `adb reverse tcp:3000 tcp:3000`
                makes the laptop's port appear as localhost here — no Tailscale
                needed for development. */}
            <Pressable style={s.preset} onPress={() => setUrl('http://localhost:3000')}>
              <Text style={s.presetText}>USB (localhost)</Text>
            </Pressable>
          </View>
          <Text style={s.presetHelp}>
            Tailscale works anywhere. USB works while the phone is plugged in with
            adb reverse running.
          </Text>
        </Card>

        <Label style={{ marginTop: 26 }}>How to save a reel</Label>
        <Card>
          <Text style={s.step}>1. Open the reel in Instagram</Text>
          <Text style={s.step}>2. Tap Share, then pick ReelBrain</Text>
          <Text style={s.step}>3. Carry on scrolling — it processes in the background</Text>
          <Text style={[s.help, { marginTop: 10 }]}>
            The laptop does the work: it downloads the reel, reads every frame,
            transcribes the audio and extracts the details. Takes about 40 seconds.
          </Text>
        </Card>

        <Label style={{ marginTop: 26 }}>Storage</Label>
        <Card>
          <Text style={s.help}>
            Videos are deleted the moment extraction finishes — only the extracted
            details and a thumbnail are kept. About 160 KB per reel instead of 18 MB.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  help: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.button,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: c.text,
    backgroundColor: c.bg,
  },
  button: {
    marginTop: 10,
    backgroundColor: c.primary,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  result: { marginTop: 10, padding: 11, borderRadius: 10 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 12 },
  preset: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  presetText: { fontSize: 12, fontWeight: '600', color: c.primary },
  presetHelp: { marginTop: 8, fontSize: 11, color: c.textFaint, lineHeight: 16 },
  step: { fontSize: 14, color: c.text, marginBottom: 6 },
});
