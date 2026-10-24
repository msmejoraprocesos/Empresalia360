import { Linking, Platform, Share } from 'react-native';

/** Dirección pública de la app web. Si cambia el dominio, se cambia solo aquí. */
export const PUBLIC_URL = 'https://msmejoraprocesos.github.io/Empresalia360/';

/** Liga que abre directo la página del experto (la que va en su QR). */
export const profileLink = (slug: string) => `${PUBLIC_URL}?p=${encodeURIComponent(slug)}`;

/** Liga que abre directo "Escribir reseña" del experto. */
export const reviewLink = (slug: string) => `${PUBLIC_URL}?p=${encodeURIComponent(slug)}&r=1`;

/** Deja solo dígitos y agrega 52 (México) si es un celular de 10 dígitos. */
export function waNumber(phone: string | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length === 10) return `52${d}`;
  return d;
}

/** Abre WhatsApp con el mensaje escrito; sin número, deja elegir el contacto. */
export function openWhatsApp(text: string, phone?: string) {
  const n = waNumber(phone);
  const url = `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url);
}

/** Compartir con lo que tenga el teléfono (WhatsApp, Mensajes, correo…); si no se puede, copia. */
export async function shareText(text: string): Promise<'compartido' | 'copiado' | 'nada'> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (navigator.share) {
        await navigator.share({ text });
        return 'compartido';
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return 'copiado';
      }
      return 'nada';
    }
    await Share.share({ message: text });
    return 'compartido';
  } catch {
    return 'nada';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sin permiso para copiar
  }
  return false;
}
