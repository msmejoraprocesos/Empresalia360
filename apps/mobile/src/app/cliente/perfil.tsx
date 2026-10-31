import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Header, ListRow } from '@/components/ui';
import { Brand, TabBarSpace } from '@/constants/theme';
import { getBusiness } from '@/data';
import { catalogStatus } from '@/data/remote';
import { signOut } from '@/lib/auth';
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
            <Text style={styles.name}>{state.account ? state.account.name || state.userName : `${state.userName} G.`}</Text>
            <Text style={styles.sub}>Cliente Frecuente · Querétaro</Text>
          </View>
        </View>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: TabBarSpace }}>
        {isSupabaseConfigured ? (
          <Card style={{ paddingVertical: 4 }}>
            <ListRow
              icon={state.account ? 'person-circle-outline' : 'mail-outline'}
              iconBg={Brand.chileSoft}
              iconColor={Brand.chileDark}
              title={state.account ? 'Mi cuenta' : 'Entrar o crear cuenta'}
              subtitle={state.account ? state.account.email : 'Con tu correo, sin contraseña. Para agendar y opinar.'}
              onPress={() => router.push('/entrar')}
              last
            />
          </Card>
        ) : null}
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="gift-outline" iconBg={Brand.mangoSoft} iconColor="#7A5600" title="Puntos, sellos y cupones" subtitle={`${state.points.toLocaleString('es-MX')} puntos`} onPress={() => router.push('/lealtad')} />
          <ListRow icon="calendar-outline" iconBg={Brand.albercaSoft} iconColor="#1757B8" title="Mis citas y cotizaciones" subtitle={`${state.orders.length} en tu historial`} onPress={() => router.push('/cliente/pedidos')} />
          <ListRow icon="people-outline" iconBg={Brand.nopalSoft} iconColor={Brand.nopalDark} title="Comunidad" subtitle="Servicios, consejos y eventos" onPress={() => router.push('/cliente/comunidad')} />
          <ListRow icon="heart-outline" iconBg={Brand.bugambiliaSoft} iconColor={Brand.bugambilia} title="Expertos guardados" subtitle={favs.map((b) => b!.name).join(', ') || 'Aún no guardas a nadie'} onPress={() => router.push('/cliente/explorar')} last />
        </Card>

        <Text style={styles.section}>Cambiar de modo</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            icon="briefcase-outline"
            iconBg={Brand.nopalSoft}
            iconColor={Brand.nopalDark}
            title="Soy profesionista"
            subtitle="Crea tu perfil y recibe clientes"
            onPress={() => {
              actions.setRole('negocio');
              router.replace('/panel');
            }}
            last={isSupabaseConfigured && !state.isAdmin}
          />
          {/* Con la base conectada solo lo ve la cuenta de administrador */}
          {!isSupabaseConfigured || state.isAdmin ? (
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
          ) : null}
        </Card>

        <Text style={styles.section}>Ayuda</Text>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon="chatbubble-ellipses-outline" title="Ayuda y soporte" subtitle="Preguntas frecuentes y contacto" onPress={() => router.push('/ayuda')} />
          <ListRow icon="document-lock-outline" title="Aviso de privacidad" onPress={() => router.push('/privacidad')} />
          <ListRow
            icon="log-out-outline"
            title="Cerrar sesión"
            onPress={() => {
              void signOut();
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
          {'\n'}Dibujos: Twemoji (CC BY 4.0) · Caras: Personas de DiceBear por Draftbot (CC BY 4.0)
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
