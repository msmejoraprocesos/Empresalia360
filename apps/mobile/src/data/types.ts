import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Role = 'vecino' | 'negocio' | 'repartidor';
export type Module = 'ordenar' | 'reservar' | 'cotizar' | 'consulta';
export type CatalogKind = 'producto' | 'cita' | 'cotizacion';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'liga';
export type OrderMode = 'para_llevar' | 'domicilio' | 'en_local';

export type Category = {
  slug: string;
  name: string;
  color: string;
  ink: string;
  icon: IconName;
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
