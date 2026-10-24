import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Header } from '@/components/ui';
import { Brand, Radius, Shadow, ShadowStrong } from '@/constants/theme';
import type { IconName, Role } from '@/data/types';
import { useApp } from '@/store/app';

const ROLES: { id: Role; label: string; sub: string; icon: IconName; color: string; soft: string; ink: string }[] = [
  { id: 'vecino', label: 'Busco un experto', sub: 'Quiero encontrar a quien me ayude, ver reseñas y agendar', icon: 'person', color: Brand.chile, soft: Brand.chileSoft, ink: Brand.chileDark },
  { id: 'negocio', label: 'Soy profesional u oficio', sub: 'Crear mi perfil con mis especialidades y recibir clientes', icon: 'briefcase', color: Brand.nopal, soft: Brand.nopalSoft, ink: Brand.nopalDark },
];

export default function ElegirPerfil() {
  const router = useRouter();
  const { actions } = useApp();
  const [role, setRole] = useState<Role>('vecino');

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Header extraBottom={44}>
          <Text style={styles.title}>¿Cómo usarás Expertalia 360?</Text>
          <Text style={styles.sub}>Puedes cambiarlo después en tu perfil</Text>
        </Header>
        <View style={{ padding: 20, marginTop: -40, gap: 12 }} accessibilityRole="radiogroup">
        {ROLES.map((r) => {
          const on = r.id === role;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setRole(r.id)}
              style={[styles.option, on ? [ShadowStrong, { borderColor: r.color }] : Shadow]}>
              <View style={[styles.icon, { backgroundColor: on ? r.color : r.soft }]}>
                <Ionicons name={r.icon} size={32} color={on ? Brand.white : r.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{r.label}</Text>
                <Text style={styles.optionSub}>{r.sub}</Text>
              </View>
              <View style={[styles.check, on ? { backgroundColor: r.color, borderWidth: 0 } : null]}>
                {on ? <Ionicons name="checkmark" size={18} color={Brand.white} /> : null}
              </View>
            </Pressable>
          );
        })}
        </View>
      </ScrollView>
      <BottomBar>
        <Button
          label="Continuar"
          onPress={() => {
            actions.setRole(role);
            router.replace(role === 'negocio' ? '/mi-negocio/perfil' : '/cliente');
          }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 16, fontSize: 28, fontWeight: '800', color: Brand.white, paddingHorizontal: 8, letterSpacing: -0.4 },
  sub: { color: '#D6E0F0', fontSize: 14, marginTop: 4, paddingHorizontal: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: Radius.lg,
    backgroundColor: Brand.white,
    borderWidth: 3,
    borderColor: Brand.white,
  },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  optionSub: { fontSize: 13, color: Brand.inkSoft, marginTop: 3 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center' },
});
