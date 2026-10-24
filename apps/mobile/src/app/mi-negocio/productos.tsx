import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BottomBar, Button, Card, Chip, Header } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { money } from '@/lib/format';
import { useApp } from '@/store/app';

const KIND: Record<string, { label: string; bg: string; fg: string }> = {
  producto: { label: 'Producto', bg: Brand.chileSoft, fg: Brand.chileDark },
  cita: { label: 'Con cita', bg: Brand.albercaSoft, fg: '#1757B8' },
  cotizacion: { label: 'Cotización', bg: Brand.jacarandaSoft, fg: Brand.jacaranda },
};

export default function Productos() {
  const router = useRouter();
  const { state, actions } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Productos y servicios" subtitle={`${state.myItems.length} en tu catálogo`} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 130 }}>
        {state.myItems.map((it) => (
          <Card key={it.id} style={styles.row}>
            {it.photo ? <Image source={{ uri: it.photo }} style={{ width: 52, height: 52, borderRadius: 12 }} contentFit="cover" accessibilityLabel={it.name} /> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, !it.available && { color: Brand.inkMuted }]}>{it.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Chip label={KIND[it.kind].label} color={KIND[it.kind].bg} ink={KIND[it.kind].fg} />
                <Text style={styles.sub}>{it.price ? money(it.price) : 'Precio por caso'}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Switch
                value={it.available}
                onValueChange={() => actions.toggleItem(it.id)}
                accessibilityLabel={`${it.name} disponible`}
                trackColor={{ true: Brand.nopal, false: '#C5CEDC' }}
                thumbColor={Brand.white}
              />
              <Text style={styles.sub}>{it.available ? 'Disponible' : 'Agotado'}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
      <BottomBar>
        <Button label="Agregar producto o servicio" icon="add" onPress={() => router.push('/mi-negocio/producto-nuevo')} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.inkSoft },
});
