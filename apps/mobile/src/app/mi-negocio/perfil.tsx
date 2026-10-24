import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BusinessCard } from '@/components/business-card';
import { PhotoPicker } from '@/components/photo-picker';
import { BottomBar, Button, Card, Field, Header } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';
import { ATTEND_ICON, ATTEND_LABEL, CATEGORIES, categoryBySlug } from '@/data';
import type { Attend, Business, GalleryItem } from '@/data/types';
import { Emoji } from '@/components/emoji';
import { isSupabaseConfigured } from '@/lib/supabase';
import { WorldGuide } from '@/components/world-guide';
import type { World } from '@/constants/world';
import { activePlan, CATEGORY_LIMIT, PLANS } from '@/data/billing';
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
  const { state } = useApp();
  // Con Supabase se necesita cuenta para que el perfil quede guardado y sea de quien lo crea
  if (isSupabaseConfigured && !state.account) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.tortilla }}>
        <Header title="Mi perfil profesional" />
        <View style={{ padding: 20, gap: 14 }}>
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <Emoji name="trabajador" size={64} />
            <Text style={[styles.h, { textAlign: 'center' }]}>Primero entra con tu correo</Text>
            <Text style={[styles.hint, { textAlign: 'center' }]}>Así tu perfil queda guardado a tu nombre y solo tú lo puedes cambiar.</Text>
          </Card>
          <Button label="Entrar con mi correo" icon="mail-outline" onPress={() => router.push('/entrar')} />
        </View>
      </View>
    );
  }
  // Se vuelve a armar el formulario si cambia la cuenta o el perfil
  return <Editor key={state.account?.userId ?? 'demo'} />;
}

function Editor() {
  const router = useRouter();
  const { state, actions } = useApp();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [name, setName] = useState(myBusiness.name);
  const [categorySlug, setCategorySlug] = useState(myBusiness.categorySlug);
  // Perfil nuevo: primero elige su mundo (profesionista u oficio); los mundos no se mezclan
  const isNew = myBusiness.id === 'nuevo';
  const [world, setWorld] = useState<World | null>(isNew ? null : categoryBySlug(myBusiness.categorySlug)?.group ?? null);
  const [extraCats, setExtraCats] = useState<string[]>(
    (myBusiness.categorySlugs ?? []).filter((s) => s !== myBusiness.categorySlug && categoryBySlug(s)?.group === categoryBySlug(myBusiness.categorySlug)?.group),
  );
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
  const [photo, setPhoto] = useState(myBusiness.photo);
  const [cover, setCover] = useState(myBusiness.cover);
  const [gallery, setGallery] = useState<GalleryItem[]>(myBusiness.gallery ?? []);
  const [newShot, setNewShot] = useState<string>();
  const [newCaption, setNewCaption] = useState('');
  const [references, setReferences] = useState(myBusiness.references ?? '');
  const [urgent24, setUrgent24] = useState(Boolean(myBusiness.urgent24));
  const [warranty, setWarranty] = useState(myBusiness.warranty ?? '');
  const [paymentInfo, setPaymentInfo] = useState(myBusiness.paymentInfo ?? '');

  const cat = categoryBySlug(categorySlug);
  const selectedCats = (world ? [categorySlug, ...extraCats] : []).map((s) => categoryBySlug(s)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const extra = specialties.filter((s) => !selectedCats.some((c) => c.specialties.some((x) => x.name === s)));
  // Cuántas categorías permite su plan (la principal cuenta)
  const bill = state.billing[myBusiness.slug];
  const myPlan = bill ? activePlan(bill) : 'estandar';
  const maxExtra = CATEGORY_LIMIT[myPlan] - 1;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const touch = () => setSaved(false);

  const patch = {
    name: name.trim(),
    categorySlug,
    categorySlugs: extraCats,
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
    photo,
    cover,
    gallery,
    references: references.trim() || undefined,
    urgent24,
    warranty: warranty.trim() || undefined,
    paymentInfo: paymentInfo.trim() || undefined,
  };
  const preview: Business = { ...myBusiness, ...patch };
  const valid = Boolean(world) && categoryBySlug(categorySlug)?.group === world && patch.name.length > 2 && patch.profession.length > 2 && specialties.length > 0 && attends.length > 0;

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
          <Text style={styles.fieldLabel}>¿A qué mundo perteneces?</Text>
          <WorldGuide
            value={world}
            onChange={(w) => {
              if (w === world) return;
              setWorld(w);
              // Al cambiar de mundo se limpia lo del otro mundo
              if (categoryBySlug(categorySlug)?.group !== w) {
                const first = CATEGORIES.find((c) => c.group === w)!;
                setCategorySlug(first.slug);
                setProfession(first.professional);
                setExtraCats([]);
                setSpecialties([]);
              }
              touch();
            }}
          />
          {world ? <Text style={styles.fieldLabel}>{world === 'profesionales' ? 'Tu profesión' : 'Tu oficio'}</Text> : null}
          <View style={styles.wrap}>
            {CATEGORIES.filter((c) => c.group === world).map((c) => (
              <Toggle
                key={c.slug}
                label={c.name}
                icon={c.icon}
                on={categorySlug === c.slug}
                onPress={() => {
                  if (c.slug !== categorySlug) {
                    setCategorySlug(c.slug);
                    setProfession(c.professional);
                    const keep = extraCats.filter((x) => x !== c.slug);
                    setExtraCats(keep);
                    // Se quedan las especialidades de las categorías que siguen elegidas
                    setSpecialties(specialties.filter((s) => [c.slug, ...keep].some((k) => categoryBySlug(k)?.specialties.some((x) => x.name === s))));
                    touch();
                  }
                }}
              />
            ))}
          </View>
          {world ? <>
          <Text style={styles.fieldLabel}>¿Ofreces algo más? Aparece también en</Text>
          <Text style={styles.hint}>
            {maxExtra > 0
              ? `Tu plan ${PLANS.find((p) => p.id === myPlan)?.name} te deja estar en ${maxExtra + 1} categorías. Llevas ${extraCats.length + 1}.`
              : 'Con el plan Estándar apareces en 1 categoría. Con Premium, en 3; con VIP, en 6.'}
          </Text>
          <View style={styles.wrap}>
            {CATEGORIES.filter((c) => c.group === world && c.slug !== categorySlug).map((c) => {
              const on = extraCats.includes(c.slug);
              const locked = !on && extraCats.length >= maxExtra;
              return (
                <Toggle
                  key={c.slug}
                  label={locked ? `${c.name} 🔒` : c.name}
                  icon={c.icon}
                  on={on}
                  onPress={() => {
                    if (locked) {
                      router.push('/mi-negocio/plan');
                      return;
                    }
                    const next = on ? extraCats.filter((x) => x !== c.slug) : [...extraCats, c.slug];
                    setExtraCats(next);
                    if (on) setSpecialties(specialties.filter((s) => !c.specialties.some((x) => x.name === s) || cat?.specialties.some((x) => x.name === s)));
                    touch();
                  }}
                />
              );
            })}
          </View>
          {maxExtra < 5 ? <Button label={maxExtra > 0 ? 'Quiero más categorías: ver planes' : 'Aparecer en más categorías: ver planes'} small variant="ghost" icon="ribbon-outline" onPress={() => router.push('/mi-negocio/plan')} /> : null}
          </> : null}
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

        <Section step={2} title="Tus fotos" hint="Los perfiles con foto reciben más visitas y confianza">
          <PhotoPicker
            label="Foto de perfil"
            aspect={[1, 1]}
            value={photo}
            onChange={(u) => {
              setPhoto(u);
              touch();
            }}
            hint="Una foto tuya, de frente y con buena luz"
          />
          <PhotoPicker
            label="Portada"
            aspect={[16, 9]}
            value={cover}
            onChange={(u) => {
              setCover(u);
              touch();
            }}
            hint="Tu despacho, tu taller o un trabajo terminado"
          />
          <Text style={styles.fieldLabel}>Galería de trabajos o despacho ({gallery.length})</Text>
          {gallery.map((g) => (
            <View key={g.id} style={styles.galleryRow}>
              <Ionicons name="image" size={18} color={Brand.chile} />
              <Text style={{ flex: 1, color: Brand.ink }} numberOfLines={1}>
                {g.caption}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${g.caption}`}
                onPress={() => {
                  setGallery(gallery.filter((x) => x.id !== g.id));
                  touch();
                }}
                hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Brand.inkSoft} />
              </Pressable>
            </View>
          ))}
          <PhotoPicker label="Agregar a la galería" value={newShot} onChange={setNewShot} hint="Antes y después, un trabajo terminado o tu lugar de trabajo" />
          <Field label="Descripción de la foto" value={newCaption} onChangeText={setNewCaption} placeholder="Cambio de calentador de paso" />
          <Button
            label="Agregar a la galería"
            small
            variant="dark"
            icon="add"
            disabled={!newShot || !newCaption.trim()}
            onPress={() => {
              setGallery([...gallery, { id: String(Date.now()), caption: newCaption.trim(), uri: newShot }]);
              setNewShot(undefined);
              setNewCaption('');
              touch();
            }}
          />
        </Section>

        <Section step={3} title="Tus especialidades" hint="Así te encuentran los clientes cuando describen su problema">
          {selectedCats.map((c) => (
            <View key={c.slug} style={{ gap: 6 }}>
              {selectedCats.length > 1 ? <Text style={styles.fieldLabel}>{c.name}</Text> : null}
              <View style={styles.wrap}>
                {c.specialties.map((s) => (
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
              </View>
            </View>
          ))}
          <View style={styles.wrap}>
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

        <Section step={4} title="Experiencia y credenciales" hint="Los perfiles con cédula verificada reciben más confianza">
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

        <Section step={5} title="Cómo y dónde atiendes">
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
            label="Referencias para llegar"
            value={references}
            onChangeText={(t) => {
              setReferences(t);
              touch();
            }}
            multiline
            placeholder="Planta alta, frente al Oxxo; hay estacionamiento de la plaza"
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
          <View style={styles.wrap}>
            <Toggle
              label="Atiendo urgencias 24 h"
              icon="flash-outline"
              on={urgent24}
              onPress={() => {
                setUrgent24(!urgent24);
                touch();
              }}
            />
          </View>
          <Field
            label="Garantía (opcional)"
            value={warranty}
            onChangeText={(t) => {
              setWarranty(t);
              touch();
            }}
            placeholder="Garantía de 3 meses por escrito"
          />
          <Field
            label="Datos para que te paguen por transferencia (opcional)"
            value={paymentInfo}
            onChangeText={(t) => {
              setPaymentInfo(t);
              touch();
            }}
            placeholder="Banco · CLABE de 18 dígitos · a nombre de quién"
          />
          <Text style={styles.hint}>No se muestran en tu perfil: solo se mandan al cliente que te contrata o cuando tú pides un pago.</Text>
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

        <Section step={6} title="Sobre ti" hint="Cuenta en pocas líneas cómo trabajas y en qué casos ayudas">
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
            label={saving ? 'Guardando…' : valid ? 'Guardar perfil' : 'Completa nombre, especialidad y modalidad'}
            icon={valid && !saving ? 'checkmark' : undefined}
            disabled={!valid || saving}
            onPress={async () => {
              setSaving(true);
              setSaveError(false);
              const ok = await actions.saveProfile(patch);
              setSaving(false);
              if (ok === false) setSaveError(true);
              else setSaved(true);
            }}
          />
        )}
        {saved ? <Text style={styles.savedNote}>Perfil guardado. Ya apareces así en las búsquedas.</Text> : null}
        {saveError ? <Text style={[styles.savedNote, { color: '#A32020' }]}>No se pudo guardar en línea. Revisa tu internet y vuelve a intentar.</Text> : null}
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
  galleryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.sm, backgroundColor: Brand.tortilla },
  warn: { fontSize: 12, color: Brand.bugambilia, fontWeight: '700' },
  savedNote: { fontSize: 12, color: Brand.nopalDark, fontWeight: '700', textAlign: 'center' },
});
