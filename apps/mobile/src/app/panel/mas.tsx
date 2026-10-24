import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Header, ListRow } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { myBusiness, useApp } from '@/store/app';

export default function Mas() {
  const router = useRouter();
  const { state, actions } = useApp();
  const newRequests = state.providerInbox.filter((p) => p.status === 'nueva').length;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Más" subtitle={myBusiness.name} back={false} color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: TabBarSpace }}>
        {isSupabaseConfigured ? (
          <Card style={{ paddingVertical: 4 }}>
            <ListRow
              icon={state.account ? 'person-circle-outline' : 'mail-outline'}
              iconBg={Brand.chileSoft}
              iconColor={Brand.chileDark}
              title={state.account ? 'Mi cuenta' : 'Entrar para guardar mi perfil'}
              subtitle={state.account ? state.account.email : 'Con tu correo, sin contraseña'}
              onPress={() => router.push('/entrar')}
              last
            />
          </Card>
        ) : null}
        <Text style={styles.section}>Mi perfil</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="person-circle-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Editar perfil y especialidades" subtitle={myBusiness.specialties.join(', ') || 'Agrega tus especialidades'} onPress={() => router.push('/mi-negocio/perfil')} />
          <ListRow icon="eye-outline" iconBg={Brand.line} title="Ver mi perfil público" subtitle="Así te ven tus clientes" onPress={() => router.push(`/negocio/${myBusiness.slug}`)} />
          <ListRow icon="briefcase-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Servicios y precios" subtitle={`${state.myItems.length} servicios`} onPress={() => router.push('/mi-negocio/productos')} />
          <ListRow icon="calendar-outline" iconBg={Brand.albercaSoft} iconColor="#1757B8" title="Agenda" subtitle="Citas y horarios" onPress={() => router.push('/mi-negocio/agenda')} />
          <ListRow icon="people-outline" iconBg={Brand.jacarandaSoft} iconColor={Brand.jacaranda} title="Clientes y lealtad" subtitle="Clientes frecuentes y tarjeta de sellos" onPress={() => router.push('/mi-negocio/clientes')} last />
        </Card>

        <Text style={styles.section}>Cobros</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="cash-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Cobrar a un cliente" subtitle="Efectivo, tarjeta o transferencia" onPress={() => router.push('/panel/cobrar')} />
          <ListRow icon="wallet-outline" title="Resumen de cobros" subtitle="Por forma de pago" onPress={() => router.push('/mi-negocio/corte')} last />
        </Card>

        <Text style={styles.section}>Crecer</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="stats-chart-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Estadísticas" subtitle="Quién ve tu perfil y qué te piden" onPress={() => router.push('/mi-negocio/estadisticas')} />
          <ListRow icon="pricetag-outline" iconBg={Brand.mangoSoft} iconColor="#7A5600" title="Promociones" subtitle={`${state.myPromotions.filter((p) => p.active).length} activas`} onPress={() => router.push('/mi-negocio/promociones')} />
          <ListRow icon="megaphone-outline" iconBg={Brand.mangoSoft} iconColor="#7A5600" title="Publicar en la comunidad" subtitle="Anuncia un servicio, un consejo o un evento" onPress={() => router.push('/mi-negocio/publicar')} />
          <ListRow icon="trophy-outline" iconBg={Brand.chileSoft} iconColor={Brand.chileDark} title="Espacios destacados" subtitle="Aparece primero en tu especialidad" onPress={() => router.push('/mi-negocio/espacios')} />
          <ListRow icon="globe-outline" iconBg={Brand.jacarandaSoft} iconColor={Brand.jacaranda} title="Mi página y QR" subtitle={`expertalia360.mx/${myBusiness.slug}`} onPress={() => router.push(`/n/${myBusiness.slug}`)} last />
        </Card>

        <Text style={styles.section}>Red de expertos</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="git-network-outline" iconBg={Brand.albercaSoft} iconColor="#1757B8" title="Pedir apoyo a otros expertos" subtitle="Perito, traductor, notario o contador para tu cliente" onPress={() => router.push('/mi-negocio/red')} />
          <ListRow icon="mail-unread-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Lo que otros expertos te piden" subtitle={newRequests ? `${newRequests} nuevas` : 'Sin encargos nuevos'} onPress={() => router.push('/mi-negocio/proveedor')} last />
        </Card>

        <Text style={styles.section}>Cuenta</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            icon="person-outline"
            title="Buscar expertos (modo cliente)"
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
