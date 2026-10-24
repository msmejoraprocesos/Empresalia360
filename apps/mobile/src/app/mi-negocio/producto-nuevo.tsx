import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoPicker } from '@/components/photo-picker';
import { BottomBar, Button, Card, Field, Header, ToggleRow } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import type { CatalogKind } from '@/data/types';
import { uploadPhoto } from '@/lib/photos';
import { myBusiness, useApp } from '@/store/app';

const KINDS: { value: CatalogKind; label: string; hint: string }[] = [
  { value: 'producto', label: 'Producto', hint: 'Se ordena y paga' },
  { value: 'cita', label: 'Servicio con cita', hint: 'Se reserva' },
  { value: 'cotizacion', label: 'Cotización', hint: 'Precio por caso' },
];

export default function ProductoNuevo() {
  const router = useRouter();
  const { actions } = useApp();
  const [kind, setKind] = useState<CatalogKind>('producto');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [extra, setExtra] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [available, setAvailable] = useState(true);
  const [photo, setPhoto] = useState<string>();
  const [saving, setSaving] = useState(false);

  const extraLabel = kind === 'producto' ? 'Tiempo de preparación' : kind === 'cita' ? 'Duración (minutos)' : 'Respondes en';
  const priceNum = Number(price.replace(/[^\d.]/g, ''));

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Agregar al catálogo" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <PhotoPicker label="Foto del producto" value={photo} onChange={setPhoto} />

        <Text style={styles.label}>¿Cómo lo vendes?</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {KINDS.map((k) => {
            const on = k.value === kind;
            return (
              <Pressable key={k.value} onPress={() => setKind(k.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.kind, on && styles.kindOn]}>
                <Text style={[styles.kindLabel, on && { color: Brand.chileDark }]}>{k.label}</Text>
                <Text style={[styles.kindHint, on && { color: Brand.chileDark }]}>{k.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 14 }}>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder={kind === 'cita' ? 'Asesoría fiscal' : kind === 'cotizacion' ? 'Regularización fiscal' : 'Declaración anual'} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label={kind === 'cotizacion' ? 'Precio desde (opcional)' : 'Precio'} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="$0" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={extraLabel} value={extra} onChangeText={setExtra} placeholder={kind === 'cita' ? '40' : kind === 'cotizacion' ? '24 h' : '15 min'} />
            </View>
          </View>
          <Field label="Sección del catálogo" value={section} onChangeText={setSection} placeholder="Paquetes, Trámites, Asesoría…" />
          <Field label="Descripción (opcional)" value={description} onChangeText={setDescription} multiline />
        </Card>
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow
            icon="checkmark-circle-outline"
            iconBg={Brand.nopalSoft}
            iconColor={Brand.nopalDark}
            title="Disponible hoy"
            subtitle="Apágalo si se agota"
            value={available}
            onChange={() => setAvailable(!available)}
            last
          />
        </Card>
      </ScrollView>
      <BottomBar>
        <Button
          label={saving ? 'Publicando…' : 'Publicar en mi perfil'}
          disabled={saving || !name.trim() || (kind !== 'cotizacion' && !priceNum)}
          onPress={async () => {
            setSaving(true);
            const photoUrl = photo ? await uploadPhoto(photo, 'productos', myBusiness.slug) : undefined;
            actions.addItem({
              photo: photoUrl,
              kind,
              name: name.trim(),
              price: priceNum || undefined,
              durationMin: kind === 'cita' ? Number(extra) || undefined : undefined,
              section: section.trim() || undefined,
              description: description.trim() || undefined,
              available,
            });
            router.back();
          }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  kind: { flex: 1, minHeight: 68, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  kindOn: { borderWidth: 2, borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  kindLabel: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  kindHint: { fontSize: 11, color: Brand.inkSoft, marginTop: 2 },
});
