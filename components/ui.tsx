import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { api } from '../lib/api';
import { c, categoryOf, radius } from '../lib/theme';

/** Small uppercase section label — 11px, wide tracking. */
export function Label({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Text style={s.label}>{String(children).toUpperCase()}</Text>
    </View>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'violet';
}) {
  const map = {
    neutral: [c.bg, c.textMuted],
    green: [c.greenSoft, c.green],
    amber: [c.amberSoft, c.amber],
    red: [c.redSoft, c.red],
    violet: [c.primarySoft, c.primary],
  } as const;
  const [bg, ink] = map[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: ink }]}>{children}</Text>
    </View>
  );
}

/**
 * Reel thumbnail with a category-tinted fallback.
 *
 * The fallback matters more than it looks: the backend purges media after
 * extraction, so a record can outlive its image. A tinted tile reads as
 * deliberate where a broken image reads as a bug.
 */
export function Thumb({
  shortcode,
  category,
  size = 56,
  rounded = 12,
}: {
  shortcode: string;
  category?: string;
  size?: number;
  rounded?: number;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const cat = categoryOf(category);

  useEffect(() => {
    let alive = true;
    api.thumbUrl(shortcode).then((u) => alive && setUri(u));
    return () => {
      alive = false;
    };
  }, [shortcode]);

  if (failed || !uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          backgroundColor: cat.tint,
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: cat.tint }}
      contentFit="cover"
      transition={120}
      onError={() => setFailed(true)}
    />
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: c.textFaint,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  empty: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.text, textAlign: 'center' },
  emptyBody: {
    marginTop: 6,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
