import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Empty, Label, Thumb } from '../../components/ui';
import { api, getBaseUrl, type SavedItem } from '../../lib/api';
import { c, radius } from '../../lib/theme';

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86400000);
}

function tone(days: number | null, passed?: boolean | null) {
  if (days === null) return { edge: c.border, ink: c.textFaint, text: 'No date stated' };
  if (passed || days < 0) return { edge: c.border, ink: c.textFaint, text: 'Closed' };
  if (days === 0) return { edge: c.red, ink: c.red, text: 'Closes today' };
  if (days <= 7) return { edge: c.amber, ink: c.amber, text: `${days} days left` };
  return { edge: c.green, ink: c.green, text: `${days} days left` };
}

export default function Alerts() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .reels()
        .then(({ items: got }) => setItems(got))
        .catch(() => setItems([]))
        .finally(() => setLoaded(true));
    }, []),
  );

  const deadlines = items
    .filter((i) => i.category === 'deadline')
    .sort((a, b) => {
      // Undated last, expired second-last — they are still worth showing, since
      // the user saved them on purpose and hiding them looks like data loss.
      const rank = (i: SavedItem) =>
        !i.deadline_date ? 2 : i.deadline_passed ? 1 : 0;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (a.deadline_date ?? '9999').localeCompare(b.deadline_date ?? '9999');
    });

  async function openIcs(shortcode: string) {
    const base = await getBaseUrl();
    Linking.openURL(`${base}/api/reels/${shortcode}/ics`);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.h1}>Alerts</Text>
        <Text style={s.sub}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>

        {loaded && deadlines.length === 0 && (
          <Empty
            title="Nothing closing"
            body="Deadlines from saved reels show up here, sorted by how soon they close."
          />
        )}

        {deadlines.length > 0 && <Label style={{ marginTop: 26 }}>Closing soon</Label>}

        {deadlines.map((item) => {
          const d = daysUntil(item.deadline_date);
          const t = tone(d, item.deadline_passed);
          const expired = d !== null && (d < 0 || item.deadline_passed);
          const link = item.registration_links?.[0];

          return (
            <View key={item.shortcode} style={[s.card, expired && { opacity: 0.55 }]}>
              <View style={[s.edge, { backgroundColor: t.edge }]} />
              <Pressable
                style={s.cardBody}
                onPress={() => router.push(`/reel/${item.shortcode}`)}
              >
                <Thumb shortcode={item.shortcode} category="deadline" size={52} />
                <View style={s.cardText}>
                  <Text style={s.title} numberOfLines={2}>
                    {item.title ?? 'Untitled'}
                  </Text>
                  {!!item.organisation && (
                    <Text style={s.org} numberOfLines={1}>
                      {item.organisation}
                    </Text>
                  )}
                </View>
                <Text style={[s.status, { color: t.ink }]}>{t.text}</Text>
              </Pressable>

              {!expired && (
                <View style={s.actions}>
                  {!!item.deadline_date && (
                    <Pressable style={s.action} onPress={() => openIcs(item.shortcode)}>
                      <Text style={s.actionText}>Add to calendar</Text>
                    </Pressable>
                  )}
                  {!!link && (
                    <Pressable
                      style={s.action}
                      onPress={() =>
                        Linking.openURL(/^https?:\/\//i.test(link) ? link : `https://${link}`)
                      }
                    >
                      <Text style={s.actionText}>Register ↗</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 14, color: c.textMuted },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  cardText: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 15, fontWeight: '600', color: c.text },
  org: { marginTop: 2, fontSize: 13, color: c.textMuted },
  status: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', paddingHorizontal: 13, paddingBottom: 13, gap: 8 },
  action: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: c.primary },
});
