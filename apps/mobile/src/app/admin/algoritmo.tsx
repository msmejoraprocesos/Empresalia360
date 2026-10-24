import { StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Stepper } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useApp } from '@/store/app';

const LABELS: Record<string, { label: string; help: string }> = {
  afinidad: { label: 'Afinidad', help: 'Qué tanto le gusta esa categoría o negocio al cliente' },
  cercania: { label: 'Cercanía', help: 'Distancia a su ubicación o a su zona' },
  calificacion: { label: 'Calificación', help: 'Estrellas y reseñas verificadas' },
  urgencia: { label: 'Urgencia', help: 'Promociones que vencen pronto' },
  abierto: { label: 'Abierto ahora', help: 'Prioriza lo que puede atender en este momento' },
};

export default function AdminAlgoritmo() {
  const { state, actions } = useApp();
  const w = state.feedWeights;
  const sum = Object.values(w).reduce((a, n) => a + n, 0);

  return (
    <AdminShell title="Algoritmo del inicio" subtitle="Orden: tus promociones → para ti → pide de nuevo → cerca de ti">
      <AdminCard style={{ gap: 4 }}>
        <Text style={styles.h}>Pesos de relevancia</Text>
        <Text style={styles.sub}>relevancia = Σ peso × factor. Suman {sum} puntos.</Text>
        {(Object.keys(w) as (keyof typeof w)[]).map((k) => (
          <View key={k} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{LABELS[k].label}</Text>
              <Text style={styles.sub}>{LABELS[k].help}</Text>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${sum ? (w[k] / sum) * 100 : 0}%` }]} />
              </View>
            </View>
            <Stepper value={w[k]} onChange={(n) => actions.setWeight(k, n)} />
          </View>
        ))}
      </AdminCard>
      <AdminCard style={{ gap: 6 }}>
        <Text style={styles.h}>Espacios patrocinados en el inicio</Text>
        <Text style={styles.text}>• Tarjeta 2 de “Para ti” · siempre con etiqueta Patrocinado</Text>
        <Text style={styles.text}>• Banner entre “Para ti” y “Pide de nuevo”</Text>
        <Text style={styles.sub}>Nunca desplazan las promociones propias del cliente del primer lugar.</Text>
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  text: { fontSize: 14, color: Brand.ink },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Brand.line },
  barBg: { height: 8, borderRadius: 4, backgroundColor: Brand.line, marginTop: 8 },
  bar: { height: 8, borderRadius: 4, backgroundColor: Brand.chile },
});
