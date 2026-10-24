import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { BottomBar, Button, Card, Field, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { ATTEND_ICON, ATTEND_LABEL, CATEGORIES, categoryBySlug } from '@/data';
import type { Attend, Business } from '@/data/types';
import { myBusiness, useApp } from '@/store/app';

const LANGS = ['Español', 'Inglés', 'Francés', 'Alemán', 'Lengua de señas'];

function Toggle({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.pill, on && styles.pillOn]}>
      {icon ? <Ionicons name={icon} size={15} color={on ? Brand.white : Brand.chile} /> : on ? <Ionicons name="checkmark" size={15} color={Brand.white} /> : null}
      <Text style={[styles.pillText, on && { color: Brand.white }]}>{label}</Text>
    </Pressable>
  );
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={styles.step}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

export default function EditarPerfil() {
  const router = useRouter();
  const { actions } = useApp();
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(myBusiness.name);
  const [categorySlug, setCategorySlug] = useState(myBusiness.categorySlug);
  const [profession, setProfession] = useState(myBusiness.profession);
  const [specialties, setSpecialties] = useState<string[]>(myBusiness.specialties);
  const [custom, setCustom] = useState('');
  const [years, setYears] = useState(String(myBusiness.yearsExp || ''));
  const [license, setLicense] = useState(myBusiness.license ?? '');
  const [education, setEducation] = useState(myBusiness.education ?? '');
  const [languages, setLanguages] = useState<string[]>(myBusiness.languages);
  const [attends, setAttends] = useState<Attend[]>(myBusiness.attends);
  const [free, setFree] = useState(myBusiness.consultPrice === 0);
  const [price, setPrice] = useState(myBusiness.consultPrice ? String(myBusiness.consultPrice) : '');
  const [description, setDescription] = useState(myBusiness.description);
  const [address, setAddress] = useState(myBusiness.address);
  const [zone, setZone] = useState(myBusiness.zone);
  const [phone, setPhone] = useState(myBusiness.phone.replace(/^521/, ''));

  const cat = categoryBySlug(categorySlug);
  const extra = specialties.filter((s) => !cat?.specialties.some((x) => x.name === s));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const touch = () => setSaved(false);

  const patch = {
    name: name.trim(),
    categorySlug,
    profession: profession.trim(),
    specialties,
    yearsExp: Number(years) || 0,
    license: license.trim() || undefined,
    education: education.trim() || undefined,
    languages,
    attends,
    consultPrice: free ? 0 : price ? Number(price) : undefined,
    description: description.trim(),
    address: address.trim(),
    zone: zone.trim(),
    phone: phone.replace(/\D/g, '') ? `521${phone.replace(/\D/g, '')}` : myBusiness.phone,
    subtitle: `${profession.trim()} · ${specialties.slice(0, 2).join(' y ').toLowerCase()}`,
  };
  const preview: Business = { ...myBusiness, ...patch };
  const valid = patch.name.length > 2 && patch.profession.length > 2 && specialties.length > 0 && attends.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
      <Header title="Mi perfil profesional" subtitle="Lo que ven tus clientes al buscarte" color={Brand.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Vista previa en resultados de búsqueda</Text>
        <View pointerEvents="none">
          <BusinessCard business={preview} />
        </View>

        <Section step={1} title="¿A qué te dedicas?" hint="Elige tu profesión u oficio">
          <Field
            label="Nombre como quieres aparecer"
            value={name}
            onChangeText={(t) => {
              setName(t);
              touch();
            }}
            placeholder="Lic. Mariana Ortiz"
          />
          <Text style={styles.fieldLabel}>Profesión u oficio</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Toggle
                key={c.slug}
                label={c.name}
                icon={c.icon}
                on={categorySlug === c.slug}
                onPress={() => {
                  if (c.slug !== categorySlug) {
                    setCategorySlug(c.slug);
                    setProfession(c.professional);
                    setSpecialties([]);
                    touch();
                  }
                }}
              />
            ))}
          </View>
          <Field
            label="Título que se muestra"
            value={profession}
            onChangeText={(t) => {
              setProfession(t);
              touch();
            }}
            placeholder={cat?.professional ?? 'Abogada'}
          />
        </Section>

        <Section step={2} title="Tus especialidades" hint="Así te encuentran los clientes cuando describen su problema">
          <View style={styles.wrap}>
            {cat?.specialties.map((s) => (
              <Toggle
                key={s.name}
                label={s.name}
                on={specialties.includes(s.name)}
                onPress={() => {
                  setSpecialties(toggle(specialties, s.name));
                  touch();
                }}
              />
            ))}
            {extra.map((s) => (
              <Toggle
                key={s}
                label={s}
                on
                onPress={() => {
                  setSpecialties(specialties.filter((x) => x !== s));
                  touch();
                }}
              />
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="Otra especialidad"
              placeholderTextColor={Brand.inkMuted}
              style={styles.addInput}
              accessibilityLabel="Agregar otra especialidad"
            />
            <Button
              label="Agregar"
              small
              variant="dark"
              disabled={!custom.trim()}
              onPress={() => {
                setSpecialties([...specialties, custom.trim()]);
                setCustom('');
                touch();
              }}
            />
          </View>
          {specialties.length === 0 ? <Text style={styles.warn}>Elige al menos una especialidad.</Text> : null}
        </Section>

        <Section step={3} title="Experiencia y credenciales" hint="Los perfiles con cédula verificada reciben más confianza">
          <Field
            label="Años de experiencia"
            value={years}
            onChangeText={(t) => {
              setYears(t.replace(/\D/g, ''));
              touch();
            }}
            keyboardType="number-pad"
            placeholder="10"
          />
          <Field
            label="Cédula profesional o certificación"
            value={license}
            onChangeText={(t) => {
              setLicense(t);
              touch();
            }}
            placeholder="Cédula 7845120"
          />
          <Field
            label="Formación"
            value={education}
            onChangeText={(t) => {
              setEducation(t);
              touch();
            }}
            placeholder="Licenciatura en Derecho, UAQ"
          />
          <Text style={styles.fieldLabel}>Idiomas</Text>
          <View style={styles.wrap}>
            {LANGS.map((l) => (
              <Toggle
                key={l}
                label={l}
                on={languages.includes(l)}
                onPress={() => {
                  setLanguages(toggle(languages, l));
                  touch();
                }}
              />
            ))}
          </View>
        </Section>

        <Section step={4} title="Cómo y dónde atiendes">
          <View style={styles.wrap}>
            {(['despacho', 'en_linea', 'domicilio'] as Attend[]).map((a) => (
              <Toggle
                key={a}
                label={ATTEND_LABEL[a]}
                icon={ATTEND_ICON[a]}
                on={attends.includes(a)}
                onPress={() => {
                  setAttends(toggle(attends, a));
                  touch();
                }}
              />
            ))}
          </View>
          <Text style={styles.fieldLabel}>Primera consulta o visita</Text>
          <View style={styles.wrap}>
            <Toggle
              label="Sin costo"
              on={free}
              onPress={() => {
                setFree(!free);
                touch();
              }}
            />
          </View>
          {!free ? (
            <Field
              label="Precio"
              value={price}
              onChangeText={(t) => {
                setPrice(t.replace(/[^\d]/g, ''));
                touch();
              }}
              keyboardType="number-pad"
              placeholder="$500"
            />
          ) : null}
          <Field
            label="Dirección o zona de servicio"
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              touch();
            }}
            placeholder="Plaza Zen, local 8"
          />
          <Field
            label="Colonia o zona"
            value={zone}
            onChangeText={(t) => {
              setZone(t);
              touch();
            }}
            placeholder="Querétaro Centro"
          />
          <Field
            label="WhatsApp"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              touch();
            }}
            keyboardType="phone-pad"
            placeholder="442 000 0000"
          />
        </Section>

        <Section step={5} title="Sobre ti" hint="Cuenta en pocas líneas cómo trabajas y en qué casos ayudas">
          <Field
            label="Descripción"
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              touch();
            }}
            multiline
            placeholder="Te acompaño en divorcios, pensiones y testamentos…"
          />
          <Text style={styles.hint}>{description.trim().length} caracteres · recomendamos más de 120</Text>
        </Section>
      </ScrollView>

      <BottomBar>
        {saved ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Listo" variant="ghost" style={{ flex: 1 }} onPress={() => router.replace('/panel')} />
            <Button label="Ver perfil público" icon="eye-outline" style={{ flex: 1.4 }} onPress={() => router.push(`/negocio/${myBusiness.slug}`)} />
          </View>
        ) : (
          <Button
            label={valid ? 'Guardar perfil' : 'Completa nombre, especialidad y modalidad'}
            icon={valid ? 'checkmark' : undefined}
            disabled={!valid}
            onPress={() => {
              actions.saveProfile(patch);
              setSaved(true);
            }}
          />
        )}
        {saved ? <Text style={styles.savedNote}>Perfil guardado. Ya apareces así en las búsquedas.</Text> : null}
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', color: Brand.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.chile, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: Brand.white, fontWeight: '800' },
  h: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  hint: { fontSize: 12, color: Brand.inkSoft, marginTop: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white },
  pillOn: { backgroundColor: Brand.chile, borderColor: Brand.chile },
  pillText: { fontSize: 13, fontWeight: '600', color: Brand.ink },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: { flex: 1, height: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.line, paddingHorizontal: 12, fontSize: 14, color: Brand.ink, backgroundColor: Brand.white },
  warn: { fontSize: 12, color: Brand.bugambilia, fontWeight: '700' },
  savedNote: { fontSize: 12, color: Brand.nopalDark, fontWeight: '700', textAlign: 'center' },
});
