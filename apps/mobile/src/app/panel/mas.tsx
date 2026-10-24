import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Header, ListRow } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { myBusiness, useApp } from '@/store/app';

export default function Mas() {
  const router = useRouter();
  const { state, actions } = useApp();
  const newRequests = state.providerInbox.filter((p) => p.status === 'nueva').length;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Más" subtitle={myBusiness.name} back={false} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace }}>
        <Text style={styles.section}>Mi negocio</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="bag-handle-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Productos y servicios" subtitle={`${state.myItems.length} en tu catálogo`} onPress={() => router.push('/mi-negocio/productos')} />
          <ListRow icon="calendar-outline" iconBg={Brand.albercaSoft} iconColor="#1757B8" title="Agenda" subtitle="Citas y horarios" onPress={() => router.push('/mi-negocio/agenda')} />
          <ListRow icon="people-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Clientes y lealtad" subtitle="Tarjeta de sellos y clientes frecuentes" onPress={() => router.push('/mi-negocio/clientes')} />
          <ListRow icon="wallet-outline" title="Corte de caja" subtitle="Ventas por forma de pago" onPress={() => router.push('/mi-negocio/corte')} last />
        </Card>

        <Text style={styles.section}>Crecer</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="stats-chart-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Estadísticas" subtitle="Quién te ve, cuánto se queda y qué elige" onPress={() => router.push('/mi-negocio/estadisticas')} />
          <ListRow icon="pricetag-outline" iconBg={Brand.mangoSoft} iconColor="#7A5600" title="Promociones" subtitle={`${state.myPromotions.filter((p) => p.active).length} activas`} onPress={() => router.push('/mi-negocio/promociones')} />
          <ListRow icon="megaphone-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Espacios preferenciales" subtitle="Aparece primero en tu zona" onPress={() => router.push('/mi-negocio/espacios')} />
          <ListRow icon="globe-outline" iconBg={Brand.jacarandaSoft} iconColor={Brand.jacaranda} title="Mi mini sitio y QR" subtitle={`expertalia360.mx/${myBusiness.slug}`} onPress={() => router.push(`/n/${myBusiness.slug}`)} last />
        </Card>

        <Text style={styles.section}>Red de negocios</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="cube-outline" iconBg={Brand.albercaSoft} iconColor="#1757B8" title="Red de expertos" subtitle="Pide un perito, traductor o notario a varios a la vez" onPress={() => router.push('/mi-negocio/red')} />
          <ListRow icon="mail-unread-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Solicitudes como proveedor" subtitle={newRequests ? `${newRequests} nuevas` : 'Sin solicitudes nuevas'} onPress={() => router.push('/mi-negocio/proveedor')} last />
        </Card>

        <Text style={styles.section}>Cuenta</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            icon="person-outline"
            title="Cambiar a modo cliente"
            onPress={() => {
              actions.setRole('vecino');
              router.replace('/cliente');
            }}
          />
          <ListRow
            icon="log-out-outline"
            title="Cerrar sesión"
            onPress={() => {
              actions.setRole(null);
              router.replace('/bienvenida');
            }}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '800', color: Brand.inkSoft, marginLeft: 4, marginTop: 4 },
});
