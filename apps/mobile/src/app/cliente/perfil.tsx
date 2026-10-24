import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Header, ListRow } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { getBusiness } from '@/data';
import { catalogStatus } from '@/data/remote';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

export default function Perfil() {
  const router = useRouter();
  const { state, actions } = useApp();
  const favs = state.favorites.map(getBusiness).filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header back={false} extraBottom={8}>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{state.userName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{state.userName} G.</Text>
            <Text style={styles.sub}>Cliente Frecuente · Querétaro</Text>
          </View>
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: TabBarSpace }}>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="wallet-outline" iconBg={Brand.mangoSoft} iconColor="#7A5600" title="Mis tarjetas y cupones" subtitle={`${state.points.toLocaleString('es-MX')} puntos`} onPress={() => router.push('/lealtad')} />
          <ListRow icon="people-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Mi comunidad" subtitle="Nivel, Ruta del mes y eventos" onPress={() => router.push('/comunidad')} />
          <ListRow icon="heart-outline" iconBg={Brand.bugambiliaSoft} iconColor={Brand.bugambilia} title="Favoritos" subtitle={favs.map((b) => b!.name).join(', ') || 'Aún no guardas negocios'} onPress={() => router.push('/cliente/explorar')} last />
        </Card>

        <Text style={styles.section}>Cambiar de modo</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            icon="storefront-outline"
            iconBg={Brand.nopalSoft}
            iconColor={Brand.nopalDark}
            title="Modo negocio"
            subtitle="Vende, cobra y atiende tu negocio"
            onPress={() => {
              actions.setRole('negocio');
              router.replace('/panel');
            }}
          />
          <ListRow
            icon="bicycle-outline"
            iconBg={Brand.albercaSoft}
            iconColor="#1757B8"
            title="Modo mensajero"
            subtitle="Recibe envíos cerca de ti"
            onPress={() => {
              actions.setRole('repartidor');
              router.replace('/repartidor');
            }}
          />
          <ListRow
            icon="shield-checkmark-outline"
            title="Panel de administración"
            subtitle="Solo para el operador de Expertalia 360"
            onPress={() => {
              actions.setAdmin(true);
              router.push('/admin');
            }}
            last
          />
        </Card>

        <Text style={styles.section}>Ayuda</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="chatbubble-ellipses-outline" title="Ayuda y soporte" onPress={() => {}} />
          <ListRow icon="document-lock-outline" title="Aviso de privacidad" onPress={() => {}} />
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
        <Text style={styles.footer}>
          Expertalia 360 0.1 ·{' '}
          {catalogStatus.source === 'supabase'
            ? 'conectado a Supabase'
            : isSupabaseConfigured
              ? `datos de ejemplo (Supabase: ${catalogStatus.error ?? 'sin respuesta'})`
              : 'datos de ejemplo'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, paddingHorizontal: 6 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.chileDark, fontWeight: '800', fontSize: 20 },
  name: { color: Brand.white, fontSize: 20, fontWeight: '800' },
  sub: { color: '#D6E0F0', fontSize: 13, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '800', color: Brand.inkSoft, marginTop: 6, marginLeft: 4 },
  footer: { textAlign: 'center', fontSize: 12, color: Brand.inkMuted, marginTop: 8 },
});
