import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { c, radius } from '../../lib/theme';

/**
 * Line icons drawn from primitives.
 *
 * Deliberately not emoji: emoji-as-icons is the single clearest tell of a
 * generated app, and an icon font would be another dependency for four glyphs.
 */
function Icon({ name, active }: { name: string; active: boolean }) {
  const ink = active ? c.primary : c.textFaint;
  const bar = (w: number, h: number, extra?: object) => (
    <View style={[{ width: w, height: h, backgroundColor: ink, borderRadius: 1 }, extra]} />
  );

  if (name === 'home') {
    return (
      <View style={s.icon}>
        <View style={[s.roof, { borderBottomColor: ink }]} />
        <View style={[s.box, { borderColor: ink }]} />
      </View>
    );
  }
  if (name === 'search') {
    return (
      <View style={s.icon}>
        <View style={[s.ring, { borderColor: ink }]} />
        {bar(2, 7, { transform: [{ rotate: '-45deg' }], marginTop: -2, marginLeft: 7 })}
      </View>
    );
  }
  if (name === 'alerts') {
    return (
      <View style={s.icon}>
        <View style={[s.bell, { borderColor: ink }]} />
        {bar(8, 1.5, { marginTop: 1 })}
      </View>
    );
  }
  return (
    <View style={s.icon}>
      <View style={[s.ring, { borderColor: ink, width: 9, height: 9, borderRadius: 4.5 }]} />
      <View style={[s.gearRim, { borderColor: ink }]} />
    </View>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[s.tabIcon, focused && { backgroundColor: c.primarySoft }]}>
      <Icon name={name} active={focused} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textFaint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabIcon: {
    width: 44,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  box: { width: 12, height: 8, borderWidth: 1.5, borderTopWidth: 0, marginTop: -0.5 },
  ring: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  bell: {
    width: 12,
    height: 11,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  gearRim: {
    position: 'absolute',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
  },
});
