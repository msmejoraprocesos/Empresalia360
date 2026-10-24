/** Tarifas de ejemplo; el operador las define en el panel de administración. */
export const AD_SLOTS = [
  { id: 'apertura', label: 'Anuncio al abrir la app', where: 'Tu logo y promoción a pantalla completa, cada 3 h por persona', rate: 100, unit: 'mes', free: 8 },
  { id: 'portada', label: 'Portada de zona', where: 'Carrusel del inicio', rate: 1500, unit: 'semana', free: 1 },
  { id: 'categoria', label: '1.º en tu categoría', where: 'Arriba de Contadores', rate: 2200, unit: 'mes', free: 1 },
  { id: 'pin', label: 'Pin destacado', where: 'Pin grande con logo en el mapa', rate: 900, unit: 'mes', free: 3 },
  { id: 'recomendado', label: 'Recomendado en pedido', where: 'Al confirmar contrataciones de otros', rate: 700, unit: 'mes', free: 2 },
  { id: 'push', label: 'Notificación patrocinada', where: 'Push a personas de tu zona', rate: 600, unit: 'envío', free: 1 },
];

/** Anuncio al abrir la app: tarifa base mensual y cada cuánto se repite la misma marca para una persona. */
export const OPENING_AD = { monthlyPrice: 100, repeatHours: 3, seconds: 6 };

export type OpeningAd = {
  id: string;
  businessSlug: string;
  headline: string;
  body?: string;
  cta: string;
  color: string;
  /** Foto del producto o promoción; si no hay, se muestra el logo */
  photo?: string;
};

/** Anuncios vigentes. Al conectar Supabase se reemplazan por la tabla opening_ads (ver src/data/remote.ts). */
export const OPENING_ADS: OpeningAd[] = [
  { id: 'oa1', businessSlug: 'despacho-contable-reyes', headline: 'Asesoría fiscal gratis', body: 'Tu primera consulta sin costo, en despacho o en línea.', cta: 'Agendar cita', color: '#1F3A68' },
  { id: 'oa2', businessSlug: 'lic-mariana-ortiz', headline: '10% en tu consulta', body: 'Derecho familiar con cédula verificada. Agenda desde aquí.', cta: 'Agendar cita', color: '#6B4FC8' },
  { id: 'oa3', businessSlug: 'notaria-publica-14', headline: 'Mes del testamento', body: 'Precio preferente todo septiembre. Cotiza en 24 h.', cta: 'Cotizar', color: '#146B4F' },
  { id: 'oa4', businessSlug: 'patricia-luna-seguros', headline: 'Revisa tus pólizas', body: 'Te digo en 40 minutos si estás bien protegido.', cta: 'Agendar cita', color: '#2F80ED' },
];
