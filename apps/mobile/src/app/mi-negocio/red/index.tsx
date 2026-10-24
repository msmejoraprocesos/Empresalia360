import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoPicker } from '@/components/photo-picker';
import { Button, Card, Chip, Field, Header, IconCircle, OptionPill } from '@/components/ui';
import { Brand, Radius, Shadow } from '@/constants/theme';
import { useApp } from '@/store/app';

export default function Red() {
  const router = useRouter();
  const { state, actions } = useApp();
  const [creating, setCreating] = useState(false);
  const [part, setPart] = useState('');
  const [doc, setDoc] = useState<string>();
  const [vehicle, setVehicle] = useState('');
  const [qty, setQty] = useState('1');
  const [urgent, setUrgent] = useState(true);
  const [forCustomer, setForCustomer] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Red de expertos" subtitle="Una solicitud llega a varios profesionales" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {creating ? (
          <Card style={{ gap: 12 }}>
            <Text style={styles.name}>Nueva solicitud</Text>
            <Field label="¿Qué necesitas?" value={part} onChangeText={setPart} placeholder="Traducción certificada, avalúo, peritaje…" />
            <Field label="Detalle o expediente" value={vehicle} onChangeText={setVehicle} placeholder="Acta de nacimiento · inglés" />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label="Documentos" value={qty} onChangeText={setQty} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 2, flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <OptionPill label="Urgente" selected={urgent} onPress={() => setUrgent(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <OptionPill label="Sin prisa" selected={!urgent} onPress={() => setUrgent(false)} />
                </View>
              </View>
            </View>
            <Field label="Para el cliente (opcional)" value={forCustomer} onChangeText={setForCustomer} placeholder="Nombre del cliente o número de presupuesto" />
            <PhotoPicker label="Documento (opcional)" value={doc} onChange={setDoc} hint="Toma foto del documento o elígelo de tu galería" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancelar" variant="ghost" style={{ flex: 1 }} onPress={() => setCreating(false)} />
              <Button
                label="Enviar a la red"
                style={{ flex: 2 }}
                disabled={!part.trim()}
                onPress={() => {
                  const id = actions.createSupplyRequest({ part: part.trim(), vehicle: vehicle.trim(), qty: Number(qty) || 1, urgent, forCustomer: forCustomer.trim() || undefined });
                  setCreating(false);
                  setPart('');
                  setVehicle('');
                  router.push(`/mi-negocio/red/${id}`);
                }}
              />
            </View>
          </Card>
        ) : (
          <Button label="Nueva solicitud a la red" icon="add" onPress={() => setCreating(true)} />
        )}

        <Text style={styles.label}>Mis solicitudes</Text>
        {state.supplyRequests.map((r) => {
          const offers = r.responses.filter((x) => x.hasIt).length;
          const chosen = r.responses.find((x) => x.id === r.chosenId);
          return (
            <Pressable key={r.id} onPress={() => router.push(`/mi-negocio/red/${r.id}`)} accessibilityRole="button" style={[styles.row, Shadow]}>
              <IconCircle icon="cube-outline" color={Brand.albercaSoft} ink="#1757B8" size={46} square />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.part}</Text>
                <Text style={styles.sub}>
                  {r.vehicle || 'Sin detalle'} · {r.qty} doc.
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {chosen ? (
                    <Chip label={`Encargado a ${chosen.supplier}`} color={Brand.nopalSoft} ink={Brand.nopalDark} />
                  ) : (
                    <Chip label={`${offers} ofertas de ${r.sentTo}`} color={Brand.mangoSoft} ink="#5A3E00" />
                  )}
                  {r.urgent ? <Chip label="Urgente" color={Brand.chileSoft} ink={Brand.chileDark} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Radius.lg, backgroundColor: Brand.white },
});
