import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Empty, Label, Pill, Thumb } from '../../components/ui';
import { api, type SavedItem } from '../../lib/api';
import { drain, readQueue, remove, type Pending } from '../../lib/queue';
import { c, categoryOf, radius, shadow } from '../../lib/theme';

const ORDER = ['food_spot', 'deadline', 'travel', 'recipe', 'product', 'other'] as const;

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86400000);
}

export default function Home() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ items: got }, q] = await Promise.all([api.reels(), readQueue()]);
      setItems(got);
      setPending(q);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // While anything is queued, poll: the reel lands ~40s after the share and the
  // user should see it appear without pulling to refresh.
  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(async () => {
      const q = await drain();
      for (const p of q) {
        if (!p.jobId) continue;
        try {
          const job = await api.job(p.jobId);
          if (job.status === 'done') {
            await remove(p.url);
            load();
          } else if (job.status === 'error') {
            await remove(p.url);
            setError(job.error ?? 'Processing failed');
            load();
          }
        } catch {
          /* keep polling; a transient failure is not a reason to give up */
        }
      }
      setPending(await readQueue());
    }, 3000);
    return () => clearInterval(t);
  }, [pending.length, load]);

  const counts = ORDER.map((k) => ({
    key: k,
    meta: categoryOf(k),
    list: items.filter((i) => i.category === k),
  })).filter((g) => g.list.length > 0);

  const closingSoon = items.filter((i) => {
    const d = daysUntil(i.deadline_date);
    return d !== null && d >= 0 && d <= 7;
  });

  const recent = [...items]
    .sort((a, b) => (b.saved_at ?? '').localeCompare(a.saved_at ?? ''))
    .slice(0, 6);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={c.primary}
          />
        }
      >
        <View style={s.brandRow}>
          <View style={s.logo} />
          <Text style={s.brand}>ReelBrain</Text>
        </View>
        <Text style={s.h1}>Your saved reels</Text>
        <Text style={s.sub}>
          {loading ? 'Loading…' : `${items.length} reels, filed for you`}
        </Text>

        {pending.length > 0 && (
          <Card style={s.processing}>
            <ActivityIndicator size="small" color={c.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.processingTitle}>
                Processing {pending.length} reel{pending.length > 1 ? 's' : ''}
              </Text>
              <Text style={s.processingBody} numberOfLines={1}>
                {pending[0].error ?? 'Reading the frames, listening to the audio…'}
              </Text>
            </View>
          </Card>
        )}

        {error && !loading && (
          <Pressable onPress={() => router.push('/settings')}>
            <Card style={s.errorCard}>
              <Text style={s.errorTitle}>Can&apos;t reach the backend</Text>
              <Text style={s.errorBody}>{error}</Text>
              <Text style={s.errorLink}>Open settings →</Text>
            </Card>
          </Pressable>
        )}

        {closingSoon.length > 0 && (
          <Pressable onPress={() => router.push('/alerts')}>
            <Card style={s.highlight}>
              <View style={s.highlightEdge} />
              <View style={{ flex: 1 }}>
                <Text style={s.highlightLabel}>CLOSING THIS WEEK</Text>
                <Text style={s.highlightTitle}>
                  {closingSoon.length} deadline{closingSoon.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={s.stack}>
                {closingSoon.slice(0, 2).map((i, n) => (
                  <View key={i.shortcode} style={{ marginLeft: n ? -14 : 0 }}>
                    <Thumb shortcode={i.shortcode} category={i.category} size={38} rounded={10} />
                  </View>
                ))}
              </View>
            </Card>
          </Pressable>
        )}

        {!loading && items.length === 0 && !error && (
          <Empty
            title="Nothing saved yet"
            body="Open Instagram, tap Share on any reel, and pick ReelBrain. We'll read it and file it here."
          />
        )}

        {counts.length > 0 && (
          <>
            <Label style={{ marginTop: 26 }}>Collections</Label>
            <View style={s.grid}>
              {counts.map(({ key, meta, list }) => (
                <Pressable
                  key={key}
                  style={s.collection}
                  onPress={() => router.push(`/search?category=${key}`)}
                >
                  <View style={s.collectionCover}>
                    <Thumb
                      shortcode={list[0].shortcode}
                      category={key}
                      size={160}
                      rounded={radius.card}
                    />
                    <View style={s.scrim} />
                    <View style={[s.badge, { backgroundColor: meta.tint }]}>
                      <View style={[s.badgeDot, { backgroundColor: meta.ink }]} />
                    </View>
                    <View style={s.collectionText}>
                      <Text style={s.collectionName}>{meta.label}</Text>
                      <Text style={s.collectionCount}>
                        {list.length} {list.length === 1 ? 'reel' : 'reels'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {recent.length > 0 && (
          <>
            <Label style={{ marginTop: 26 }}>Recently saved</Label>
            {recent.map((item) => {
              const d = daysUntil(item.deadline_date);
              const detail =
                item.category === 'deadline'
                  ? d === null
                    ? 'No date stated'
                    : d < 0
                      ? 'Closed'
                      : d === 0
                        ? 'Closes today'
                        : `${d} days left`
                  : item.category === 'food_spot'
                    ? [item.area, item.city].filter(Boolean).join(', ') || 'Location unresolved'
                    : item.category === 'travel'
                      ? `${item.place_count ?? 0} places`
                      : item.category === 'recipe'
                        ? [
                            item.total_time_minutes ? `${item.total_time_minutes} min` : null,
                            item.ingredient_count ? `${item.ingredient_count} ingredients` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : item.category === 'product'
                          ? (item.product_names ?? []).join(', ') || 'Products'
                          : item.topic || 'Saved';

              return (
                <Pressable
                  key={item.shortcode}
                  style={s.row}
                  onPress={() => router.push(`/reel/${item.shortcode}`)}
                >
                  <Thumb shortcode={item.shortcode} category={item.category} size={56} />
                  <View style={s.rowText}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {item.title ?? 'Untitled'}
                    </Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {detail}
                    </Text>
                  </View>
                  {item.category === 'deadline' && d !== null && d >= 0 && d <= 7 && (
                    <Pill tone={d === 0 ? 'red' : 'amber'}>{d === 0 ? 'Today' : `${d}d`}</Pill>
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 24, height: 24, borderRadius: 7, backgroundColor: c.primary },
  brand: { marginLeft: 9, fontSize: 15, fontWeight: '600', color: c.text },
  h1: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 14, color: c.textMuted },

  processing: { marginTop: 18, flexDirection: 'row', alignItems: 'center' },
  processingTitle: { fontSize: 14, fontWeight: '600', color: c.text },
  processingBody: { marginTop: 2, fontSize: 12, color: c.textMuted },

  errorCard: { marginTop: 18, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  errorTitle: { fontSize: 14, fontWeight: '600', color: c.red },
  errorBody: { marginTop: 3, fontSize: 12, color: '#B91C1C' },
  errorLink: { marginTop: 8, fontSize: 12, fontWeight: '600', color: c.primary },

  highlight: { marginTop: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  highlightEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: c.amber,
  },
  highlightLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, color: c.amber },
  highlightTitle: { marginTop: 3, fontSize: 16, fontWeight: '600', color: c.text },
  stack: { flexDirection: 'row' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  collection: { width: '48.5%', marginBottom: 13 },
  collectionCover: { borderRadius: radius.card, overflow: 'hidden', ...shadow },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: { width: 9, height: 9, borderRadius: 2, opacity: 0.9 },
  collectionText: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  collectionName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  collectionCount: { marginTop: 1, fontSize: 12, color: 'rgba(255,255,255,0.82)' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    marginBottom: 9,
  },
  rowText: { flex: 1, marginLeft: 12, marginRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: c.text },
  rowSub: { marginTop: 2, fontSize: 13, color: c.textMuted },
});
