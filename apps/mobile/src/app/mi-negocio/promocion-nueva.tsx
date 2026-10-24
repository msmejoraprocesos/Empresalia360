import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoPicker } from '@/components/photo-picker';
import { BottomBar, Button, Card, Field, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { uploadPhoto } from '@/lib/photos';
import { myBusiness, useApp } from '@/store/app';

const TARGETS = [
  { id: 'clientes', label: 'Mis clientes', sub: 'Quienes ya te compraron, por WhatsApp o app', reach: 412 },
  { id: 'inactivos', label: 'Clientes que no han vuelto', sub: 'Sin visita en 30 días', reach: 96 },
  { id: 'cerca', label: 'Personas cerca ahora', sub: 'Con ubicación y notificaciones activas', reach: 150 },
  { id: 'zona', label: 'Toda mi zona', sub: 'Inicio de Zen House y Residencial del Parque', reach: 2300 },
];
const RADII = [500, 800, 1200, 2000];

export default function PromocionNueva() {
  const router = useRouter();
  const { actions } = useApp();
  const [title, setTitle] = useState('Primera asesoría fiscal sin costo');
  const [limit, setLimit] = useState('100');
  const [until, setUntil] = useState('15 nov');
  const [target, setTarget] = useState('clientes');
  const [radius, setRadius] = useState(800);
  const [photo, setPhoto] = useState<string>();
  const [saving, setSaving] = useState(false);
  const t = TARGETS.find((x) => x.id === target)!;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Nueva promoción" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <PhotoPicker label="Foto de la promoción" value={photo} onChange={setPhoto} hint="Muestra el producto en promoción: es lo primero que ven tus futuros clientes" />
        <Card style={{ gap: 12 }}>
          <Field label="¿Qué ofreces?" value={title} onChangeText={setTitle} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Canjes máximos" value={limit} onChangeText={setLimit} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Vence" value={until} onChangeText={setUntil} />
            </View>
          </View>
        </Card>
        <Text style={styles.label}>¿A quién le llega?</Text>
        {TARGETS.map((x) => {
          const on = x.id === target;
          return (
            <Pressable key={x.id} onPress={() => setTarget(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.target, on && styles.targetOn]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{x.label}</Text>
                <Text style={styles.sub}>{x.sub}</Text>
              </View>
              <Text style={[styles.reach, on && { color: Brand.chileDark }]}>{x.reach.toLocaleString('es-MX')}</Text>
            </Pressable>
          );
        })}
        {target === 'cerca' ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.name}>Radio</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {RADII.map((r) => (
                <Pressable key={r} onPress={() => setRadius(r)} accessibilityRole="button" style={[styles.radius, r === radius && styles.targetOn]}>
                  <Text style={{ fontWeight: '700', color: r === radius ? Brand.chileDark : Brand.ink }}>{r < 1000 ? `${r} m` : `${r / 1000} km`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sub}>Solo llega a quien activó ubicación y notificaciones.</Text>
          </Card>
        ) : null}
      </ScrollView>
      <BottomBar>
        <Button
          label={`Publicar · llega a ${t.reach.toLocaleString('es-MX')} personas`}
          disabled={saving || !title.trim()}
          onPress={async () => {
            setSaving(true);
            const photoUrl = photo ? await uploadPhoto(photo, 'promociones', myBusiness.slug) : undefined;
            actions.addPromotion({ title: title.trim(), target: t.label, reach: t.reach, photo: photoUrl });
            router.back();
          }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  targetOn: { borderWidth: 2, borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  name: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  reach: { fontSize: 14, fontWeight: '800', color: Brand.inkSoft },
  radius: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Brand.line, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.white },
});
