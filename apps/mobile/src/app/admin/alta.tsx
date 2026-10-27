import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminShell } from '@/components/admin-shell';
import { Button, Field } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { CATEGORIES, ZONE } from '@/data';
import { adminCreateBusiness, loadCatalog } from '@/data/remote';
import type { Attend, Business } from '@/data/types';
import { claimMessage, openWhatsApp } from '@/lib/links';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/store/app';

type World = 'profesionales' | 'oficios';
const newSlug = (name: string) =>
  `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
const nearZone = () => ({ lat: ZONE.lat + (Math.random() - 0.5) * 0.01, lng: ZONE.lng + (Math.random() - 0.5) * 0.01 });
const ATTENDS: { id: Attend; label: string }[] = [
  { id: 'despacho', label: 'En su despacho o taller' },
  { id: 'domicilio', label: 'A domicilio' },
  { id: 'en_linea', label: 'En línea' },
];

/**
 * Alta de un experto hecha por el administrador. El perfil queda publicado, sin dueño y con 30 días
 * de prueba; el experto lo reclama desde la liga que le mandas por WhatsApp.
 */
export default function AdminAlta() {
  const router = useRouter();
  const { actions } = useApp();
  const [world, setWorld] = useState<World | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState(ZONE.name);
  const [address, setAddress] = useState('');
  const [license, setLicense] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [attends, setAttends] = useState<Attend[]>(['despacho']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ slug: string; name: string; phone: string } | null>(null);

  const category = CATEGORIES.find((c) => c.slug === cat);
  const ready = Boolean(world && cat && name.trim().length > 2 && phone.replace(/\D/g, '').length >= 10);

  async function save() {
    if (!ready || !cat) return;
    setSaving(true);
    setError('');
    const form = {
      name: name.trim(), categorySlug: cat, profession: profession.trim() || category?.professional || '', phone: phone.trim(), email: email.trim(),
      zone: zone.trim() || ZONE.name, address: address.trim(), license: license.trim(), specialties, description: description.trim(), attends,
    };
    if (isSupabaseConfigured) {
      const r = await adminCreateBusiness(form);
      setSaving(false);
      if (!r.slug) return setError(r.error ?? 'No se pudo guardar');
      // Se vuelve a leer el directorio para que el perfil nuevo ya se pueda abrir
      await loadCatalog();
      actions.bumpAdmin();
      return setDone({ slug: r.slug, name: form.name, phone: form.phone });
    }
    // Demostración: se agrega a la lista local
    const slug = newSlug(form.name);
    const b: Business = {
      id: slug, slug, name: form.name, categorySlug: cat, subtitle: form.profession, description: form.description, address: form.address, zone: form.zone,
      ...nearZone(), rating: 0, ratingCount: 0, isOpen: true, closesAt: '18:00',
      phone: form.phone, profession: form.profession, specialties, yearsExp: 0, license: form.license || undefined, languages: ['Español'], attends,
      modules: ['reservar', 'cotizar', 'consulta'], delivers: false, verified: false, reviews: [], gallery: [], claimable: true,
      items: [{ id: `${slug}-1`, kind: 'cita', section: 'Consultas', name: world === 'oficios' ? 'Visita de diagnóstico' : 'Consulta inicial', durationMin: 45, available: true }],
    };
    actions.addLocalBusiness(b);
    setSaving(false);
    setDone({ slug, name: form.name, phone: form.phone });
  }

  function reset() {
    setDone(null);
    setWorld(null);
    setCat(null);
    setName('');
    setProfession('');
    setPhone('');
    setEmail('');
    setAddress('');
    setLicense('');
    setSpecialties([]);
    setDescription('');
    setAttends(['despacho']);
  }

  if (done) {
    return (
      <AdminShell title="Experto dado de alta" subtitle="Ya aparece en el directorio con 30 días de prueba">
        <AdminCard style={{ gap: 12 }}>
          <Text style={styles.big}>{done.name}</Text>
          <Text style={styles.text}>Ahora mándale su liga por WhatsApp. Cuando la abra y toque “¿Eres tú? Reclama este perfil”, te llega a Negocios → Reclamos para que lo apruebes.</Text>
          <Button label="Mandarle su liga por WhatsApp" icon="logo-whatsapp" onPress={() => openWhatsApp(claimMessage(done.name, done.slug), done.phone)} />
          <View style={styles.wrap}>
            <Button label="Ver su perfil" variant="ghost" small onPress={() => router.push(`/n/${done.slug}`)} />
            <Button label="Dar de alta otro" variant="ghost" small icon="add" onPress={reset} />
            <Button label="Ir a Negocios" variant="ghost" small onPress={() => router.replace('/admin/negocios')} />
          </View>
        </AdminCard>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Dar de alta un experto" subtitle="Tú lo registras; él lo reclama con su correo">
      <AdminCard style={{ gap: 12 }}>
        <Text style={styles.step}>1. ¿Es profesionista u oficio?</Text>
        <View style={styles.wrap}>
          {(['profesionales', 'oficios'] as World[]).map((w) => (
            <Pressable
              key={w}
              accessibilityRole="radio"
              accessibilityState={{ checked: world === w }}
              onPress={() => {
                setWorld(w);
                setCat(null);
                setSpecialties([]);
              }}
              style={[styles.world, world === w && { borderColor: w === 'oficios' ? '#8A3F0E' : '#1F3A68', backgroundColor: w === 'oficios' ? '#FBEADF' : '#E3ECFB' }]}>
              <Text style={styles.worldTitle}>{w === 'oficios' ? '🔧 Oficio' : '🎓 Profesionista'}</Text>
              <Text style={styles.small}>{w === 'oficios' ? 'Técnicos y maestros: plomero, electricista, carpintero…' : 'Con carrera y cédula: abogado, contador, psicólogo…'}</Text>
            </Pressable>
          ))}
        </View>

        {world ? (
          <>
            <Text style={styles.step}>2. Categoría</Text>
            <View style={styles.wrap}>
              {CATEGORIES.filter((c) => c.group === world).map((c) => (
                <Pressable key={c.slug} onPress={() => { setCat(c.slug); setSpecialties([]); }} style={[styles.pill, cat === c.slug && styles.pillOn]} accessibilityRole="radio" accessibilityState={{ checked: cat === c.slug }}>
                  <Text style={[styles.pillText, cat === c.slug && { color: Brand.white }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {category ? (
          <>
            <Text style={styles.step}>3. Especialidades</Text>
            <View style={styles.wrap}>
              {category.specialties.map((sp) => {
                const on = specialties.includes(sp.name);
                return (
                  <Pressable key={sp.name} onPress={() => setSpecialties((l) => (on ? l.filter((x) => x !== sp.name) : [...l, sp.name]))} style={[styles.pill, on && styles.pillOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    <Text style={[styles.pillText, on && { color: Brand.white }]}>{sp.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.step}>4. Datos</Text>
            <Field label="Nombre o negocio *" value={name} onChangeText={setName} placeholder={world === 'oficios' ? 'Plomería Hernández' : 'Lic. Mariana Ortiz'} />
            <Field label={world === 'oficios' ? 'Oficio' : 'Profesión'} value={profession} onChangeText={setProfession} placeholder={category.professional} />
            <Field label="WhatsApp *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="442 123 4567" />
            <Field label="Correo (para avisarle de su mensualidad)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="opcional" />
            <Field label="Zona" value={zone} onChangeText={setZone} />
            <Field label="Dirección" value={address} onChangeText={setAddress} placeholder="opcional" />
            <Field
              label={world === 'oficios' ? 'Certificado (CONOCER u otro)' : 'Cédula profesional'}
              value={license}
              onChangeText={setLicense}
              placeholder={world === 'oficios' ? 'opcional' : 'Número de cédula'}
            />
            <Text style={styles.label}>¿Dónde atiende?</Text>
            <View style={styles.wrap}>
              {ATTENDS.map((a) => {
                const on = attends.includes(a.id);
                return (
                  <Pressable key={a.id} onPress={() => setAttends((l) => (on ? (l.length > 1 ? l.filter((x) => x !== a.id) : l) : [...l, a.id]))} style={[styles.pill, on && styles.pillOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    <Text style={[styles.pillText, on && { color: Brand.white }]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Qué hace, años de experiencia… (él la puede cambiar después)" />
          </>
        ) : null}

        {error ? <Text style={{ color: '#A32020', fontWeight: '700' }}>{error}</Text> : null}
        <Button label={saving ? 'Guardando…' : 'Dar de alta'} icon="checkmark" disabled={!ready || saving} onPress={save} />
        <Text style={styles.small}>Queda publicado sin palomita de verificado, en plan Estándar con 30 días de prueba. Cuando lo reclame, el perfil pasa a su cuenta.</Text>
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  text: { fontSize: 15, color: Brand.ink, lineHeight: 21 },
  step: { fontSize: 17, fontWeight: '800', color: Brand.ink, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  small: { fontSize: 12, color: Brand.inkSoft, lineHeight: 17 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  world: { flexGrow: 1, flexBasis: 220, borderWidth: 2, borderColor: Brand.line, borderRadius: Radius.lg, padding: 14, gap: 4, backgroundColor: Brand.white },
  worldTitle: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 14, fontWeight: '700', color: Brand.ink },
});
