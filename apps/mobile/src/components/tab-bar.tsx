import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import type { IconName } from '@/data/types';

export type TabSpec = { name: string; label: string; icon: IconName; iconActive: IconName; center?: boolean };

/**
 * Barra inferior con ícono y texto en cada botón, y un botón redondo flotante
 * al centro (Mi QR para el vecino, Cobrar para el negocio).
 */
export function makeTabBar(tabs: TabSpec[]) {
  return function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, index) => {
          const spec = tabs.find((t) => t.name === route.name);
          if (!spec) return null;
          const focused = state.index === index;
          if (spec.center) {
            return (
              <View key={route.key} style={styles.item}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={spec.label}
                  onPress={() => navigateToTab(route.key)}
                  style={({ pressed }) => [styles.center, pressed && { transform: [{ scale: 0.95 }] }]}>
                  <Ionicons name={spec.icon} size={28} color={Brand.white} />
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={spec.label}
              onPress={() => navigateToTab(route.key)}
              style={styles.item}>
              <Ionicons name={focused ? spec.iconActive : spec.icon} size={24} color={focused ? Brand.chile : Brand.inkSoft} />
              <Text style={[styles.label, { color: focused ? Brand.chile : Brand.inkSoft, fontWeight: focused ? '800' : '500' }]}>
                {spec.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 },
  label: { fontSize: 11 },
  center: {
    width: 64,
    height: 64,
    marginTop: -32,
    borderRadius: 32,
    backgroundColor: Brand.chile,
    borderWidth: 5,
    borderColor: Brand.tortilla,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.chile,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
