import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Header } from '@/components/ui';
import { SOPORTE_CORREO } from '@/constants/contacto';
import { Brand } from '@/constants/theme';

// Borrador de aviso de privacidad simplificado. Debe revisarlo un abogado antes de publicar la app.
const SECTIONS: { h: string; p: string }[] = [
  { h: 'Quién es responsable', p: 'Expertalia 360 es responsable del uso y protección de tus datos personales.' },
  { h: 'Qué datos usamos', p: 'Tu nombre, correo y, si lo das, tu celular. Si eres profesional: tu perfil, cédula o certificado, fotos, dirección y datos para recibir pagos. También guardamos tus citas, cotizaciones, reseñas y publicaciones.' },
  { h: 'Para qué', p: 'Para que encuentres expertos, agendes y te contacten; para mostrar perfiles y reseñas; para verificar cédulas; y para mejorar la app con estadísticas anónimas. No vendemos tus datos.' },
  { h: 'Con quién se comparten', p: 'Solo con el experto que contactas (tu nombre y el detalle de tu solicitud) y con los proveedores que operan la app (alojamiento y envío de correos).' },
  { h: 'Tus derechos (ARCO)', p: `Puedes pedir ver, corregir o borrar tus datos, u oponerte a su uso, escribiendo a ${SOPORTE_CORREO}. Te respondemos en un máximo de 20 días hábiles.` },
  { h: 'Cambios', p: 'Si este aviso cambia, lo verás aquí y te avisaremos dentro de la app.' },
];

export default function Privacidad() {
  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Aviso de privacidad" subtitle="Versión simplificada" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {SECTIONS.map((s) => (
          <Card key={s.h} style={{ gap: 6 }}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  p: { fontSize: 14, color: Brand.ink, lineHeight: 21 },
});
