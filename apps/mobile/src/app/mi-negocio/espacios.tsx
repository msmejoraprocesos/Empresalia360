import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdStory } from '@/components/opening-ad';
import { PhotoPicker } from '@/components/photo-picker';
import { BottomBar, Button, Card, Chip, Field, Header, OptionPill, Stepper } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { AD_SLOTS, OPENING_AD, OPENING_ADS } from '@/data/ads';
import { useBusinessStats } from '@/hooks/use-business-stats';
import { money } from '@/lib/format';
import { uploadPhoto } from '@/lib/photos';
import { myBusiness, useApp } from '@/store/app';

const AD_COLORS = [Brand.chile, Brand.bugambilia, Brand.jacaranda, Brand.alberca, Brand.nopal, Brand.ink];
const CTAS = ['Ver promoción', 'Ver servicios', 'Contratar', 'Agendar cita', 'Cotizar'];

export default function Espacios() {
  const { state, actions } = useApp();
  const [slot, setSlot] = useState('apertura');
  const [units, setUnits] = useState(1);
  const [bought, setBought] = useState(false);
  const [headline, setHeadline] = useState(myBusiness.promo ?? '');
  const [body, setBody] = useState('Solo enseñando la app en caja.');
  const [cta, setCta] = useState(myBusiness.modules.includes('ordenar') ? 'Ver servicios' : 'Ver promoción');
  const [color, setColor] = useState<string>(Brand.chile);
  const [adPhoto, setAdPhoto] = useState<string>();
  const [saving, setSaving] = useState(false);
  const { stats: adStats } = useBusinessStats(myBusiness, 30);
  const myOpening = OPENING_ADS.find((a) => a.businessSlug === myBusiness.slug);
  const s = AD_SLOTS.find((x) => x.id === slot)!;
  const sub = s.rate * units * 0.9;
  const total = Math.round(sub * 1.16);

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Espacios preferenciales" subtitle="Aparece primero en tu zona" color={Brand.chile} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 230 }}>
        <Text style={styles.sub}>Todo espacio pagado lleva la etiqueta “Patrocinado” y nunca cambia tus calificaciones.</Text>
        {AD_SLOTS.map((x) => {
          const on = x.id === slot;
          return (
            <Pressable key={x.id} onPress={() => setSlot(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.slot, on && styles.slotOn]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{x.label}</Text>
                <Text style={styles.sub}>{x.where}</Text>
                <Text style={[styles.rate, on && { color: Brand.chileDark }]}>
                  {money(x.rate)} por {x.unit}
                </Text>
              </View>
              <Chip label={`${x.free} libre${x.free === 1 ? '' : 's'}`} color={x.free ? Brand.nopalSoft : Brand.line} ink={x.free ? Brand.nopalDark : Brand.inkSoft} />
            </Pressable>
          );
        })}
        {slot === 'apertura' ? (
          <Card style={{ gap: 12 }}>
            <Text style={styles.name}>Tu anuncio al abrir la app</Text>
            <Text style={styles.sub}>
              Aparece a pantalla completa {OPENING_AD.seconds} segundos cuando alguien abre Expertalia 360. Cada persona lo ve como máximo una vez cada{' '}
              {OPENING_AD.repeatHours} horas, para que no canse.
            </Text>
            {myOpening && adStats ? (
              <View style={styles.result}>
                <Text style={[styles.name, { color: Brand.nopalDark }]}>Tu anuncio activo, últimos 30 días</Text>
                <Text style={styles.resultText}>
                  Lo vieron <Text style={{ fontWeight: '800' }}>{adStats.adViews.toLocaleString('es-MX')}</Text> personas ·{' '}
                  <Text style={{ fontWeight: '800' }}>{adStats.adTaps.toLocaleString('es-MX')}</Text> lo tocaron y entraron a tu página (
                  {adStats.adViews ? Math.round((adStats.adTaps / adStats.adViews) * 100) : 0}%)
                </Text>
              </View>
            ) : null}
            <PhotoPicker label="Foto del anuncio" value={adPhoto} onChange={setAdPhoto} aspect={[1, 1]} hint="Tu producto estrella. Si no subes foto, se muestra tu logo" />
            <Field label="Promoción (lo más grande)" value={headline} onChangeText={(t) => setHeadline(t.slice(0, 40))} placeholder="Asesoría gratis" />
            <Field label="Detalle" value={body} onChangeText={(t) => setBody(t.slice(0, 90))} placeholder="Hoy de 4 a 6 pm" />
            <Text style={styles.label}>Botón</Text>
            <View style={styles.wrap}>
              {CTAS.map((c) => (
                <OptionPill key={c} label={c} selected={cta === c} onPress={() => setCta(c)} />
              ))}
            </View>
            <Text style={styles.label}>Color</Text>
            <View style={styles.wrap} accessibilityRole="radiogroup">
              {AD_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ checked: color === c }}
                  style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
                />
              ))}
            </View>
            <Text style={styles.label}>Así se verá</Text>
            <View style={styles.phone}>
              <AdStory ad={{ headline, body, cta, color, photo: adPhoto }} business={myBusiness} compact />
            </View>
          </Card>
        ) : null}
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.name}>¿Cuántas {s.unit === 'mes' ? 'meses' : s.unit === 'semana' ? 'semanas' : 'envíos'}?</Text>
          <Stepper value={units} onChange={(n) => setUnits(Math.max(1, Math.min(12, n)))} />
        </Card>
        {state.myAds.length ? (
          <>
            <Text style={[styles.name, { marginTop: 6 }]}>Mis espacios</Text>
            {state.myAds.map((a) => (
              <Card key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.name}>{a.slot}</Text>
                <Chip
                  label={a.status === 'activa' ? 'Activo' : 'En revisión'}
                  color={a.status === 'activa' ? Brand.nopalSoft : Brand.mangoSoft}
                  ink={a.status === 'activa' ? Brand.nopalDark : '#5A3E00'}
                />
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
      <BottomBar>
        <View style={styles.line}>
          <Text style={styles.sub}>
            {money(s.rate)} × {units} · descuento de tu plan −10% · IVA
          </Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        {bought ? <Text style={[styles.sub, { color: Brand.nopalDark, fontWeight: '700' }]}>¡Listo! Tu espacio queda en revisión y se publica al aprobarse.</Text> : null}
        <Button
          label="Comprar y pagar"
          disabled={saving || (s.id === 'apertura' && headline.trim().length < 3)}
          onPress={async () => {
            setSaving(true);
            const photoUrl = s.id === 'apertura' && adPhoto ? await uploadPhoto(adPhoto, 'anuncios', myBusiness.slug) : undefined;
            setSaving(false);
            actions.buyAd({
              advertiser: myBusiness.name,
              slot: s.label,
              zones: 1,
              units,
              total,
              opening: s.id === 'apertura' ? { id: `oa-${Date.now()}`, businessSlug: myBusiness.slug, headline: headline || 'Promoción', body, cta, color, photo: photoUrl } : undefined,
            });
            setBought(true);
          }}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
  name: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  rate: { fontSize: 13, fontWeight: '700', color: Brand.inkSoft, marginTop: 4 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  slotOn: { borderWidth: 2, borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  label: { fontSize: 13, fontWeight: '700', color: Brand.inkSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  swatchOn: { borderWidth: 3, borderColor: Brand.white, outlineWidth: 2, outlineColor: Brand.ink, outlineStyle: 'solid' },
  phone: { alignSelf: 'center', width: 210, height: 430, borderRadius: 26, overflow: 'hidden', borderWidth: 6, borderColor: Brand.ink },
  result: { backgroundColor: Brand.nopalSoft, borderRadius: Radius.md, padding: 12, gap: 4 },
  resultText: { fontSize: 13, color: Brand.ink, lineHeight: 19 },
});
