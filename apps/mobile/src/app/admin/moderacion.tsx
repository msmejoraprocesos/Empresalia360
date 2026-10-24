import { StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Chip, EmptyState, Stars } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useApp } from '@/store/app';

export default function AdminModeracion() {
  const { state, actions } = useApp();
  return (
    <AdminShell title="Moderación" subtitle="Reseñas y fotos reportadas · responder en 48 horas">
      {state.reportedReviews.length === 0 ? <EmptyState icon="shield-checkmark-outline" title="Nada que moderar" text="No hay reportes pendientes." /> : null}
      {state.reportedReviews.map((r) => (
        <AdminCard key={r.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text style={styles.name}>
              {r.business} · {r.author}
            </Text>
            <Chip label={r.reason} color={Brand.chileSoft} ink={Brand.chileDark} />
          </View>
          <Stars rating={r.rating} />
          <Text style={styles.body}>{r.body}</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button label="Mantener publicada" variant="ghost" small onPress={() => actions.resolveReport(r.id)} />
            <Button label="Ocultar reseña" variant="dark" small onPress={() => actions.resolveReport(r.id)} />
          </View>
        </AdminCard>
      ))}
      <AdminCard style={{ backgroundColor: Brand.mangoSoft }}>
        <Text style={{ color: '#5A3E00', fontSize: 13, lineHeight: 19 }}>
          Reglas: sin ataques personales, sin datos privados, sin spam. El negocio puede responder pero no borrar; ocultar una reseña no cambia que la visita fue verificada.
        </Text>
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  body: { fontSize: 14, color: Brand.ink, lineHeight: 20 },
});
