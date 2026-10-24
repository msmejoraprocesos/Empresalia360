import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip, EmptyState } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { BUSINESSES, categoryName } from '@/data';
import { useApp } from '@/store/app';

export default function AdminNegocios() {
  const { state, actions } = useApp();
  const router = useRouter();
  const [docs, setDocs] = useState<string | null>(null);
  return (
    <AdminShell title="Negocios" subtitle={`${BUSINESSES.length} activos · ${state.pendingBusinesses.length} por aprobar`}>
      <Text style={styles.h}>Por aprobar</Text>
      {state.pendingBusinesses.length === 0 ? <EmptyState icon="checkmark-done-outline" title="Todo al día" text="No hay altas pendientes." /> : null}
      {state.pendingBusinesses.map((b) => (
        <AdminCard key={b.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{b.name}</Text>
            <Text style={styles.sub}>
              {b.category} · {b.zone} · dueño: {b.owner}
            </Text>
            {docs === b.id ? (
              <View style={{ marginTop: 6, gap: 4 }}>
                <Text style={styles.name}>{b.license ?? 'Sin documento cargado'}</Text>
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.cedulaprofesional.sep.gob.mx/')}>
                  <Text style={{ color: Brand.alberca, fontWeight: '700', fontSize: 12 }}>Verificar cédula en el Registro Nacional de Profesionistas (SEP) ›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Button label={docs === b.id ? 'Ocultar' : 'Ver documentos'} variant="ghost" small onPress={() => setDocs(docs === b.id ? null : b.id)} />
          <Button label="Aprobar" variant="success" small onPress={() => actions.approveBusiness(b.id)} />
        </AdminCard>
      ))}
      <Text style={[styles.h, { marginTop: 8 }]}>Activos</Text>
      <AdminCard style={{ paddingVertical: 4 }}>
        {BUSINESSES.map((b, i) => (
          <Pressable
            key={b.slug}
            accessibilityRole="button"
            accessibilityLabel={`Ver estadísticas de ${b.name}`}
            onPress={() => router.push(`/mi-negocio/estadisticas?slug=${b.slug}`)}
            style={[styles.listRow, i < BUSINESSES.length - 1 && { borderBottomWidth: 1, borderBottomColor: Brand.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.sub}>
                {categoryName(b.categorySlug)} · {b.zone} · ★ {b.rating.toFixed(1)}
              </Text>
            </View>
            <Chip label={b.verified ? 'Verificado' : 'Sin verificar'} color={b.verified ? Brand.nopalSoft : Brand.mangoSoft} ink={b.verified ? Brand.nopalDark : '#5A3E00'} />
            <Chip label="Estadísticas" icon="stats-chart-outline" />
          </Pressable>
        ))}
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
});
