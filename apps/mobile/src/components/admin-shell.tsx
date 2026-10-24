import { usePathname, useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Radius } from '@/constants/theme';
import { useApp } from '@/store/app';

const NAV: { href: string; label: string; badge?: 'negocios' | 'moderacion' | 'campanas' }[] = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/negocios', label: 'Negocios', badge: 'negocios' },
  { href: '/admin/moderacion', label: 'Moderación', badge: 'moderacion' },
  { href: '/admin/publicidad', label: 'Publicidad', badge: 'campanas' },
  { href: '/admin/promociones', label: 'Promociones globales' },
  { href: '/admin/notificaciones', label: 'Notificaciones' },
  { href: '/admin/algoritmo', label: 'Algoritmo del inicio' },
  { href: '/admin/cobros', label: 'Planes y cobros' },
];

/** Marco del panel de administración: barra lateral en pantallas anchas, menú horizontal en el teléfono. */
export function AdminShell({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const { state } = useApp();
  const wide = width >= 900;
  const counts = {
    negocios: state.pendingBusinesses.length,
    moderacion: state.reportedReviews.length,
    campanas: state.campaigns.filter((c) => c.status === 'en_revision').length,
  };

  const nav = NAV.map((n) => {
    const on = path === n.href;
    const count = n.badge ? counts[n.badge] : 0;
    return (
      <Pressable
        key={n.href}
        onPress={() => router.push(n.href as Href)}
        accessibilityRole="link"
        accessibilityState={{ selected: on }}
        style={[wide ? styles.navItem : styles.navChip, on && (wide ? styles.navItemOn : styles.navChipOn)]}>
        <Text style={[styles.navText, on && { color: Brand.white, fontWeight: '800' }, !wide && !on && { color: Brand.ink }]}>{n.label}</Text>
        {count ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: Brand.tortilla }}>
      {wide ? (
        <View style={[styles.side, { paddingTop: insets.top + 22 }]}>
          <Text style={styles.logo}>
            expertalia<Text style={{ color: Brand.mango }}> 360</Text>
          </Text>
          <Text style={styles.sideSub}>Administración</Text>
          <View style={{ gap: 2, marginTop: 18 }}>{nav}</View>
          <Pressable onPress={() => router.replace('/')} style={[styles.navItem, { marginTop: 20 }]} accessibilityRole="link">
            <Text style={styles.navText}>Salir del panel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ backgroundColor: Brand.ink, paddingTop: insets.top + 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Text style={styles.logo}>
              expertalia<Text style={{ color: Brand.mango }}> 360</Text> <Text style={styles.sideSub}>admin</Text>
            </Text>
            <Pressable onPress={() => router.replace('/')} accessibilityRole="link" hitSlop={8}>
              <Text style={{ color: '#E3E8EF', fontSize: 13 }}>Salir</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 8 }}>
            {nav}
          </ScrollView>
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 30 : 16, paddingBottom: 60 }}>
        <View style={{ maxWidth: 1120, width: '100%', gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              <Text style={styles.title}>{title}</Text>
            </View>
            {action}
          </View>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function AdminCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  side: { width: 240, backgroundColor: Brand.ink, paddingHorizontal: 14 },
  logo: { fontSize: 24, fontWeight: '800', color: '#3E62A0', paddingHorizontal: 12 },
  sideSub: { fontSize: 12, color: '#B7C1D3', paddingHorizontal: 12, fontWeight: '500' },
  navItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, paddingHorizontal: 12, borderRadius: 10 },
  navItemOn: { backgroundColor: '#27324C' },
  navChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: Brand.tortilla },
  navChipOn: { backgroundColor: Brand.chile },
  navText: { color: '#E3E8EF', fontSize: 14 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Brand.mango, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 13, color: Brand.inkSoft },
  title: { fontSize: 30, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
