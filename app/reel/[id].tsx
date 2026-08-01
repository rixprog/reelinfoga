import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Label, Pill } from '../../components/ui';
import { api, getBaseUrl, type SavedItem } from '../../lib/api';
import { c, categoryOf, radius } from '../../lib/theme';

type Evidence = { field: string; source: string; quote: string };

/** How the extractor's source tags read to a human. */
const SOURCE_LABEL: Record<string, string> = {
  frame: 'ON-SCREEN',
  transcript: 'AUDIO',
  caption: 'CAPTION',
  hashtag: 'HASHTAG',
  comment: 'COMMENT',
  creator_reply: 'CREATOR',
  geotag: 'GEOTAG',
  tagged_user: 'TAGGED',
  bio: 'BIO',
};

const CONFIDENCE = {
  high: { label: 'High confidence', tone: 'green' as const },
  medium: { label: 'Needs confirming', tone: 'amber' as const },
  low: { label: 'Not identified', tone: 'neutral' as const },
};

export default function ReelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [hero, setHero] = useState<string | null>(null);
  const [tab, setTab] = useState<'native' | 'english' | 'roman'>('english');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .reels()
      .then(({ items }) => {
        const found = items.find((i) => i.shortcode === id) ?? null;
        setItem(found);
        if (!found) setError('That reel is not in the library.');
      })
      .catch((e) => setError((e as Error).message));
    api.thumbUrl(String(id)).then(setHero);
  }, [id]);

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <Pressable style={s.backPlain} onPress={() => router.back()}>
          <Text style={s.backPlainText}>← Back</Text>
        </Pressable>
        <Text style={s.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  const p = item.payload as Record<string, any>;
  const cat = categoryOf(item.category);
  const conf = CONFIDENCE[(item.confidence ?? 'low') as keyof typeof CONFIDENCE];
  const evidence: Evidence[] = p.evidence ?? [];
  const transcript = (p.transcript ?? {}) as Record<string, string>;

  const where = [p.area, p.city, p.state].filter(Boolean).join(', ');
  const mapsQuery = encodeURIComponent(
    [p.place_name, p.area, p.city].filter(Boolean).join(', '),
  );

  return (
    <View style={s.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <View style={s.heroWrap}>
          {hero && (
            <Image
              source={{ uri: hero }}
              style={s.hero}
              contentFit="cover"
              transition={150}
            />
          )}
          <View style={[s.heroFallback, { backgroundColor: cat.tint }]} />
          <SafeAreaView edges={['top']} style={s.heroBar}>
            <Pressable style={s.circle} onPress={() => router.back()}>
              <Text style={s.circleText}>←</Text>
            </Pressable>
            <Pressable style={s.circle} onPress={() => Linking.openURL(item.url)}>
              <Text style={s.circleText}>↗</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={s.sheet}>
          <Pill tone={conf.tone}>{conf.label}</Pill>

          <Text style={s.title}>
            {item.title ?? p.place_name ?? p.dish_name ?? 'Untitled'}
          </Text>
          {!!where && <Text style={s.where}>{where}</Text>}
          {!!p.organisation && <Text style={s.where}>{p.organisation}</Text>}

          {/* Directions only at high confidence. A MEDIUM result means we could
              not pin the city — offering navigation would send someone to the
              wrong branch of a chain. */}
          {item.category === 'food_spot' && item.confidence === 'high' && (
            <Pressable
              style={s.primary}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
                )
              }
            >
              <Text style={s.primaryText}>Get directions</Text>
            </Pressable>
          )}

          {item.category === 'deadline' && !!item.deadline_date && (
            <View style={s.dates}>
              <View style={s.dateBox}>
                <Text style={s.dateLabel}>APPLY BEFORE</Text>
                <Text style={s.dateValue}>{item.deadline_date}</Text>
              </View>
              {!!p.event_date && (
                <View style={s.dateBox}>
                  <Text style={s.dateLabel}>EVENT</Text>
                  <Text style={s.dateValue}>{p.event_date}</Text>
                </View>
              )}
            </View>
          )}

          {item.category === 'deadline' && (
            <View style={s.actionRow}>
              {!!item.deadline_date && (
                <Pressable
                  style={s.primarySmall}
                  onPress={async () =>
                    Linking.openURL(`${await getBaseUrl()}/api/reels/${id}/ics`)
                  }
                >
                  <Text style={s.primaryText}>Add to calendar</Text>
                </Pressable>
              )}
              {(item.registration_links ?? []).slice(0, 1).map((l) => (
                <Pressable
                  key={l}
                  style={s.outline}
                  onPress={() =>
                    Linking.openURL(/^https?:\/\//i.test(l) ? l : `https://${l}`)
                  }
                >
                  <Text style={s.outlineText}>Register ↗</Text>
                </Pressable>
              ))}
            </View>
          )}

          {Array.isArray(p.dishes) && p.dishes.length > 0 && (
            <>
              <Label style={s.section}>Dishes</Label>
              <View style={s.chips}>
                {p.dishes.map((d: string) => (
                  <View key={d} style={s.chip}>
                    <Text style={s.chipText}>{d}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {Array.isArray(p.offers) && p.offers.length > 0 && (
            <>
              <Label style={s.section}>Offers</Label>
              {p.offers.map((o: string) => (
                <View key={o} style={s.offerRow}>
                  <View style={s.dot} />
                  <Text style={s.offer}>{o}</Text>
                </View>
              ))}
            </>
          )}

          {Array.isArray(p.ingredients) && p.ingredients.length > 0 && (
            <>
              <Label style={s.section}>Ingredients</Label>
              {p.ingredients.map((ing: any, n: number) => (
                <View key={n} style={s.ingredient}>
                  <Text style={s.qty}>
                    {[ing.quantity, ing.unit].filter(Boolean).join(' ') || '—'}
                  </Text>
                  <Text style={s.ingredientName}>{ing.item}</Text>
                </View>
              ))}
            </>
          )}

          {Array.isArray(p.steps) && p.steps.length > 0 && (
            <>
              <Label style={s.section}>Method</Label>
              {p.steps.map((st: any) => (
                <View key={st.order} style={s.step}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{st.order}</Text>
                  </View>
                  <Text style={s.stepText}>
                    {st.instruction}
                    {st.duration_minutes ? `  (${st.duration_minutes} min)` : ''}
                  </Text>
                </View>
              ))}
            </>
          )}

          {Array.isArray(p.key_points) && p.key_points.length > 0 && (
            <>
              <Label style={s.section}>Key points</Label>
              {p.key_points.map((k: string, n: number) => (
                <Text key={n} style={s.bullet}>
                  ·  {k}
                </Text>
              ))}
            </>
          )}

          {/* The whole point of the product: every claim is traceable. This is a
              hero element, not an accordion. */}
          {evidence.length > 0 && (
            <>
              <Label style={s.section}>How we know</Label>
              <Card>
                {evidence.slice(0, 8).map((e, n) => (
                  <View key={n} style={[s.evRow, n > 0 && s.evDivider]}>
                    <View style={s.evTag}>
                      <Text style={s.evTagText}>
                        {SOURCE_LABEL[e.source] ?? e.source.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.evField}>{e.field}</Text>
                      <Text style={s.evQuote}>&ldquo;{e.quote}&rdquo;</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          {!!transcript.native && (
            <>
              <Label style={s.section}>Transcript</Label>
              <View style={s.tabs}>
                {(
                  [
                    ['native', (transcript.language ?? 'Original').toUpperCase()],
                    ['english', 'English'],
                    ['roman', 'Romanised'],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={[s.tab, tab === key && s.tabActive]}
                  >
                    <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Card>
                <Text style={s.transcript}>
                  {transcript[tab] || 'Nothing for this view.'}
                </Text>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { padding: 24, fontSize: 15, color: c.textMuted },
  backPlain: { padding: 20 },
  backPlainText: { fontSize: 15, color: c.primary, fontWeight: '600' },

  heroWrap: { height: 300, backgroundColor: c.border },
  hero: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 },
  heroFallback: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  heroBar: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  circleText: { fontSize: 17, color: c.text },

  sheet: {
    marginTop: -26,
    backgroundColor: c.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    zIndex: 3,
  },
  title: { marginTop: 12, fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  where: { marginTop: 4, fontSize: 15, color: c.textMuted },

  primary: {
    marginTop: 16,
    backgroundColor: c.primary,
    borderRadius: radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primarySmall: {
    backgroundColor: c.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  outline: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: c.surface,
  },
  outlineText: { color: c.primary, fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 16 },

  dates: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dateBox: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 13,
  },
  dateLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: c.textFaint },
  dateValue: { marginTop: 4, fontSize: 16, fontWeight: '600', color: c.text },

  section: { marginTop: 26 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, color: c.text },

  offerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green, marginTop: 7, marginRight: 9 },
  offer: { flex: 1, fontSize: 14, color: c.text, lineHeight: 20 },

  ingredient: { flexDirection: 'row', marginBottom: 7 },
  qty: { width: 84, fontSize: 14, fontWeight: '600', color: c.text, fontVariant: ['tabular-nums'] },
  ingredientName: { flex: 1, fontSize: 14, color: c.textMuted },

  step: { flexDirection: 'row', marginBottom: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: c.primary },
  stepText: { flex: 1, fontSize: 14, color: c.text, lineHeight: 20 },

  bullet: { fontSize: 14, color: c.text, lineHeight: 21, marginBottom: 5 },

  evRow: { flexDirection: 'row', paddingVertical: 9 },
  evDivider: { borderTopWidth: 1, borderTopColor: c.border },
  evTag: {
    backgroundColor: c.bg,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 10,
  },
  evTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: c.textMuted },
  evField: { fontSize: 11, color: c.textFaint },
  evQuote: { marginTop: 1, fontSize: 13, color: c.text, lineHeight: 18 },

  tabs: { flexDirection: 'row', gap: 7, marginBottom: 11 },
  tab: {
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  tabActive: { backgroundColor: c.primary, borderColor: c.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: '#fff' },
  transcript: { fontSize: 14, color: c.text, lineHeight: 21 },
});
