import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Card, EmptyState, Field, Header, OptionPill } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { getBusiness } from '@/data';
import { track, useBusinessScreen } from '@/lib/analytics';
import { useApp } from '@/store/app';

export default function Cotizar() {
  const { slug, item: itemParam } = useLocalSearchParams<{ slug: string; item?: string }>();
  const router = useRouter();
  const { actions } = useApp();
  const b = getBusiness(slug);
  const quotable = b?.items.filter((i) => i.kind === 'cotizacion') ?? [];
  const [itemId, setItemId] = useState(itemParam ?? quotable[0]?.id);
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState<'hoy' | 'semana' | 'flexible'>('semana');
  const [sent, setSent] = useState(false);

  useBusinessScreen(b, 'cotizar', 'vista_catalogo');
  if (!b) return <EmptyState icon="storefront-outline" title="Negocio no encontrado" text="" />;
  const item = quotable.find((i) => i.id === itemId);

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Solicitud enviada" back={false} color={Brand.jacaranda} />
        <View style={{ padding: 24, gap: 14 }}>
          <Text style={styles.big}>{b.name} recibió tu solicitud</Text>
          <Text style={styles.text}>Te avisamos cuando responda con precio. Normalmente contestan el mismo día.</Text>
          <Button label="Ver mis solicitudes" onPress={() => router.replace('/cliente/pedidos')} />
          <Button label="Volver" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Pedir cotización" subtitle={b.name} color={Brand.jacaranda} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {quotable.length ? (
          <>
            <Text style={styles.label}>¿Qué necesitas?</Text>
            <View style={styles.wrap}>
              {quotable.map((q) => (
                <OptionPill key={q.id} label={q.name} selected={q.id === itemId} onPress={() => setItemId(q.id)} />
              ))}
            </View>
          </>
        ) : null}
        <Card style={{ gap: 14 }}>
          <Field
            label="Cuéntale tu caso"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={item?.description ?? 'Describe lo que necesitas, con medidas, modelo o detalles.'}
          />
          <Text style={styles.label}>¿Para cuándo?</Text>
          <View style={styles.wrap}>
            <OptionPill label="Hoy" selected={when === 'hoy'} onPress={() => setWhen('hoy')} />
            <OptionPill label="Esta semana" selected={when === 'semana'} onPress={() => setWhen('semana')} />
            <OptionPill label="Sin prisa" selected={when === 'flexible'} onPress={() => setWhen('flexible')} />
          </View>
          <Button label="Agregar foto" variant="ghost" icon="camera-outline" small />
        </Card>
        <Text style={styles.text}>Tu teléfono no se comparte; el negocio te responde dentro de la app.</Text>
      </ScrollView>
      <BottomBar>
        <Button
          label="Enviar solicitud"
          disabled={description.trim().length < 5}
          onPress={() => {
            if (item) track(b, 'seleccion', { itemId: item.id });
            actions.requestQuote({ business: b, item, description });
            setSent(true);
          }}
          style={{ backgroundColor: Brand.jacaranda }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  text: { fontSize: 13, color: Brand.inkSoft, lineHeight: 19 },
  big: { fontSize: 24, fontWeight: '800', color: Brand.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
