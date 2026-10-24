import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Role = 'vecino' | 'negocio' | 'repartidor';
export type Module = 'reservar' | 'cotizar' | 'consulta';
/** Dónde atiende el profesional */
export type Attend = 'despacho' | 'en_linea' | 'domicilio';
export type CatalogKind = 'producto' | 'cita' | 'cotizacion';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'liga';
export type OrderMode = 'para_llevar' | 'domicilio' | 'en_local';

export type Specialty = {
  name: string;
  /** Palabras con las que un cliente describe su problema ("despido", "fuga", "divorcio") */
  keywords: string[];
};

export type Category = {
  slug: string;
  name: string;
  /** Cómo se llama a quien la ejerce, ej. "Abogado", "Plomero" */
  professional: string;
  group: 'profesionales' | 'oficios';
  color: string;
  ink: string;
  icon: IconName;
  specialties: Specialty[];
};

export type GalleryItem = { id: string; caption: string; uri?: string; color?: string };

export type Question = {
  id: string;
  author: string;
  categorySlug: string;
  specialty?: string;
  body: string;
  dateLabel: string;
  answers: { businessSlug: string; body: string; helpful: number }[];
};

export type Post = {
  id: string;
  businessSlug: string;
  kind: 'servicio' | 'consejo' | 'evento';
  title: string;
  body: string;
  /** Especialidad a la que se refiere, para filtrar el muro */
  specialty?: string;
  price?: number;
  priceNote?: string;
  dateLabel: string;
  likes: number;
  comments: { author: string; body: string }[];
};

export type IncomingRequest = {
  id: string;
  type: 'cita' | 'cotizacion' | 'contratacion';
  /** Monto ya pagado o por cobrar en contrataciones */
  amount?: number;
  paymentMethod?: PaymentMethod;
  customer: string;
  specialty: string;
  detail: string;
  when: string;
  attend: Attend;
  status: 'nueva' | 'aceptada' | 'cotizada' | 'rechazada';
  quotedPrice?: number;
};

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  description?: string;
  section?: string;
  price?: number;
  durationMin?: number;
  available: boolean;
  /** Liga pública (Supabase Storage) o foto local del teléfono */
  photo?: string;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
  verified: boolean;
  paidWith?: PaymentMethod;
  dateLabel: string;
  reply?: string;
};

export type LoyaltyProgram = {
  kind: 'sellos' | 'puntos';
  goal?: number;
  percent?: number;
  reward: string;
};

export type Business = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  subtitle: string;
  description: string;
  address: string;
  zone: string;
  lat: number;
  lng: number;
  rating: number;
  ratingCount: number;
  isOpen: boolean;
  closesAt: string;
  phone: string;
  /** Profesión o oficio tal como se muestra, ej. "Abogada", "Electricista" */
  profession: string;
  specialties: string[];
  yearsExp: number;
  /** Cédula profesional o certificación (oficios: certificación o registro) */
  license?: string;
  education?: string;
  languages: string[];
  attends: Attend[];
  /** Precio de la primera consulta o visita; 0 = sin costo */
  consultPrice?: number;
  responseTime?: string;
  /** Foto de perfil y de portada (liga pública o foto local) */
  photo?: string;
  cover?: string;
  /** Trabajos o despacho: fotos con descripción; sin foto se muestra un recuadro de color */
  gallery?: GalleryItem[];
  /** Cómo llegar: "Frente al parque, segundo piso, timbre 3" */
  references?: string;
  /** Atiende urgencias fuera de horario */
  urgent24?: boolean;
  /** Garantía por escrito del trabajo (oficios) */
  warranty?: string;
  modules: Module[];
  delivers: boolean;
  verified: boolean;
  promo?: string;
  staff?: string[];
  loyalty?: LoyaltyProgram;
  items: CatalogItem[];
  reviews: Review[];
};

export type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  kind: 'vence' | 'cumpleanos' | 'global' | 'negocio';
  businessSlug?: string;
  photo?: string;
};

export type OrderLine = { itemId: string; name: string; price: number; qty: number };

export type OrderStatus = 'recibido' | 'aceptado' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';

export type Order = {
  id: string;
  type: 'pedido' | 'cita' | 'cotizacion';
  businessSlug: string;
  businessName: string;
  detail: string;
  total: number;
  status: OrderStatus | 'confirmada' | 'atendida' | 'esperando';
  createdAt: number;
  rated?: boolean;
  lines?: OrderLine[];
  customerName?: string;
  mode?: OrderMode;
  paymentMethod?: PaymentMethod;
  deliveryNote?: string;
};

export type Sale = {
  id: string;
  amount: number;
  method: PaymentMethod;
  customerPhone?: string;
  customerName?: string;
  createdAt: number;
};
