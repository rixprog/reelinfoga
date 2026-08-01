import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { Empty, Thumb } from '../../components/ui';
import { api, type SavedItem, type SearchResult } from '../../lib/api';
import { c, categoryOf, radius } from '../../lib/theme';

const SUGGESTIONS = [
  'that biryani recipe',
  'cheap earphones',
  'internship deadlines',
  'waterfall trek',
];

export default function Search() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [browse, setBrowse] = useState<SavedItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arriving from a Home collection: show that category rather than a blank box.
  useEffect(() => {
    if (!category) return setBrowse(null);
    api
      .reels()
      .then(({ items }) => setBrowse(items.filter((i) => i.category === category)))
      .catch(() => setBrowse([]));
  }, [category]);

  const run = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim()) {
      setResults(null);
      return;
    }
    // Debounced: every keystroke would otherwise embed the query server-side.
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const { results: r } = await api.search(text);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const catMeta = category ? categoryOf(category) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.h1}>{catMeta ? catMeta.label : 'Search'}</Text>
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t);
            run(t);
          }}
          placeholder="Search everything you've saved"
          placeholderTextColor={c.textFaint}
          style={s.input}
          autoCapitalize="none"
        />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {busy && <ActivityIndicator style={{ marginTop: 20 }} color={c.primary} />}

        {!q && !category && (
          <>
            <Text style={s.hint}>Try</Text>
            {SUGGESTIONS.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => {
                  setQ(sug);
                  run(sug);
                }}
                style={s.suggestion}
              >
                <Text style={s.suggestionText}>{sug}</Text>
              </Pressable>
            ))}
          </>
        )}

        {results?.length === 0 && !busy && (
          <Empty title="Nothing matched" body="Try fewer words, or a different phrasing." />
        )}

        {(results ?? []).map((r) => (
          <Pressable
            key={r.shortcode}
            style={s.row}
            onPress={() => router.push(`/reel/${r.shortcode}`)}
          >
            <Thumb shortcode={r.shortcode} category={r.category} size={64} />
            <View style={s.rowText}>
              <Text style={s.rowTitle} numberOfLines={1}>
                {r.title ?? 'Untitled'}
              </Text>
              {!!r.snippet && (
                <Text style={s.snippet} numberOfLines={2}>
                  {r.snippet}
                </Text>
              )}
              <Text style={s.meta}>
                {[
                  r.owner ? `@${r.owner}` : null,
                  categoryOf(r.category).label,
                  // Showing which arm matched makes the hybrid legible rather
                  // than magic — and explains a hit with no shared keywords.
                  r.matched.semantic !== undefined
                    ? `meaning ${r.matched.semantic.toFixed(2)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))}

        {!q &&
          (browse ?? []).map((item) => (
            <Pressable
              key={item.shortcode}
              style={s.row}
              onPress={() => router.push(`/reel/${item.shortcode}`)}
            >
              <Thumb shortcode={item.shortcode} category={item.category} size={64} />
              <View style={s.rowText}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {item.title ?? 'Untitled'}
                </Text>
                <Text style={s.meta}>{item.owner ? `@${item.owner}` : ''}</Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  h1: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  input: {
    marginTop: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: c.text,
  },
  scroll: { padding: 20, paddingTop: 6, paddingBottom: 40 },
  hint: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, color: c.textFaint, marginBottom: 10 },
  suggestion: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  suggestionText: { fontSize: 14, color: c.text },
  row: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
  },
  rowText: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: c.text },
  snippet: { marginTop: 3, fontSize: 13, color: c.textMuted, lineHeight: 18 },
  meta: { marginTop: 5, fontSize: 11, color: c.textFaint },
});
