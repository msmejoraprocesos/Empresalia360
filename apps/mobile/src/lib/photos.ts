import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Fotos de productos, promociones y anuncios.
 * - Se eligen de la galería o se toman con la cámara (recortadas al tamaño de la tarjeta).
 * - Si el dueño tiene sesión en Supabase, se suben al bucket público "fotos" y se guarda su liga.
 *   Sin sesión, la foto se usa desde el teléfono mientras la app esté abierta.
 */
export type PhotoSource = 'camara' | 'galeria';

export async function pickPhoto(source: PhotoSource, aspect: [number, number] = [4, 3]): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 };
  if (source === 'camara') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Permite el acceso a la cámara en los ajustes del teléfono para tomar la foto.');
    const res = await ImagePicker.launchCameraAsync(options);
    return res.canceled ? null : res.assets[0]?.uri ?? null;
  }
  const res = await ImagePicker.launchImageLibraryAsync(options);
  return res.canceled ? null : res.assets[0]?.uri ?? null;
}

/** Sube la foto y regresa su liga pública; si no se puede subir, regresa la foto local. */
export async function uploadPhoto(uri: string, folder: 'productos' | 'promociones' | 'anuncios', businessSlug: string): Promise<string> {
  if (!supabase || uri.startsWith('http')) return uri;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return uri;
    const blob = await (await fetch(uri)).blob();
    const type = blob.type || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const path = `${businessSlug}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos').upload(path, await blob.arrayBuffer(), { contentType: type, upsert: false });
    if (error) return uri;
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl;
  } catch {
    return uri;
  }
}
