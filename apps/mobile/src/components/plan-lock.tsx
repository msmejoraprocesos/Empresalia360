import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Button, Card } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { planById, type PlanId } from '@/data/billing';
import { myBusiness, useApp } from '@/store/app';

/** Lo que incluye cada nivel (lo mismo que dice el folleto y la tabla de planes) */
export const PLAN_RANK: Record<PlanId, number> = { estandar: 0, premium: 1, vip: 2 };
export const LIMITS = {
  /** Servicios en el perfil con Estándar */
  servicios: 5,
  /** Promociones activas con Premium (VIP: ilimitadas) */
  promociones: 3,
};
export const hasPlan = (plan: PlanId, need: PlanId) => PLAN_RANK[plan] >= PLAN_RANK[need];

/** Plan del perfil propio */
export function useMyPlan(): PlanId {
  const { state } = useApp();
  return state.billing[myBusiness.slug]?.plan ?? 'estandar';
}

/** Tarjeta de candado: dice qué nivel lo incluye y lleva a "Mi plan" */
export function PlanLock({ need, title, text }: { need: PlanId; title: string; text: string }) {
  const router = useRouter();
  return (
    <Card style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Emoji name="candado" size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.badge}>{need === 'vip' ? 'Solo VIP' : 'Desde Premium'}</Text>
          <Text style={styles.h}>{title}</Text>
        </View>
      </View>
      <Text style={styles.text}>{text}</Text>
      <Button label={`Subir a ${planById(need).name}`} variant="mango" icon="arrow-up" onPress={() => router.push('/mi-negocio/plan')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, borderWidth: 2, borderColor: '#E3B04B', backgroundColor: '#FFF9EA' },
  badge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#13203F', backgroundColor: '#E3B04B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  h: { fontSize: 17, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  text: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
});
