import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius } from '@/constants/theme';
import { pickPhoto, type PhotoSource } from '@/lib/photos';

/** Campo de foto: tomar con la cámara o elegir de la galería, con vista previa y opción de quitarla. */
export function PhotoPicker({
  value,
  onChange,
  aspect = [4, 3],
  label = 'Foto',
  hint,
}: {
  value?: string;
  onChange: (uri: string | undefined) => void;
  aspect?: [number, number];
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const choose = async (source: PhotoSource) => {
    setError(undefined);
    setBusy(true);
    try {
      const uri = await pickPhoto(source, aspect);
      if (uri) onChange(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la foto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View>
          <Image source={{ uri: value }} style={[styles.preview, { aspectRatio: aspect[0] / aspect[1] }]} contentFit="cover" accessibilityLabel="Foto elegida" />
          <Pressable onPress={() => onChange(undefined)} accessibilityRole="button" accessibilityLabel="Quitar foto" style={styles.remove}>
            <Ionicons name="trash-outline" size={18} color={Brand.white} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.empty}>
          {busy ? <ActivityIndicator color={Brand.chile} /> : <Ionicons name="image-outline" size={30} color={Brand.chile} />}
          <Text style={styles.emptyText}>{hint ?? 'Una buena foto hace que más clientes se detengan a verlo'}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => choose('camara')} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="camera-outline" size={20} color={Brand.chileDark} />
          <Text style={styles.btnText}>{value ? 'Otra foto' : 'Tomar foto'}</Text>
        </Pressable>
        <Pressable onPress={() => choose('galeria')} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="images-outline" size={20} color={Brand.chileDark} />
          <Text style={styles.btnText}>Galería</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  empty: { height: 130, borderRadius: Radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD3DF', backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, color: Brand.inkSoft, textAlign: 'center' },
  preview: { width: '100%', borderRadius: Radius.lg, backgroundColor: Brand.line },
  remove: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  btn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Brand.chile, backgroundColor: Brand.chileSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '800', color: Brand.chileDark },
  error: { fontSize: 13, color: Brand.chileDark },
});
