import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { OPENING_ADS, type OpeningAd } from '@/data/ads';
import { BUSINESSES, INCOMING_ORDERS, PROMOTIONS, INITIAL_ORDERS, MY_BUSINESS_SLUG } from '@/data/mock';
import { track } from '@/lib/analytics';
import type { Business, CatalogItem, Order, OrderMode, PaymentMethod, Review, Role, Sale } from '@/data/types';

// ─────────────────────────────────────────────────────────────
// Tipos del estado
// ─────────────────────────────────────────────────────────────
export type SupplyResponse = {
  id: string;
  supplier: string;
  distanceKm: number;
  rating: number;
  hasIt: boolean;
  brand?: string;
  price?: number;
  readyIn?: string;
};

export type SupplyRequest = {
  id: string;
  part: string;
  vehicle: string;
  qty: number;
  urgent: boolean;
  forCustomer?: string;
  createdAt: number;
  sentTo: number;
  responses: SupplyResponse[];
  chosenId?: string;
};

export type ProviderRequest = {
  id: string;
  from: string;
  distanceKm: number;
  part: string;
  vehicle: string;
  urgent: boolean;
  status: 'nueva' | 'ofertada' | 'no_tengo';
  offerPrice?: number;
  readyIn?: string;
};

export type Quote = {
  id: string;
  businessSlug: string;
  businessName: string;
  vehicle: string;
  note: string;
  lines: { name: string; detail: string; price: number; optional?: boolean }[];
  status: 'por_aprobar' | 'aprobado' | 'rechazado';
  readyText: string;
};

export type DeliveryJob = {
  id: string;
  pickup: string;
  pickupDetail: string;
  dropoff: string;
  dropoffDetail: string;
  km: number;
  pay: number;
  urgent: boolean;
  status: 'oferta' | 'aceptado' | 'recogido' | 'entregado' | 'pasado';
};

export type AdCampaign = {
  id: string;
  advertiser: string;
  slot: string;
  zones: number;
  units: number;
  total: number;
  status: 'por_pagar' | 'en_revision' | 'activa' | 'terminada';
  /** Si es un anuncio al abrir la app, su contenido */
  opening?: OpeningAd;
};

export type PendingBusiness = { id: string; name: string; category: string; zone: string; owner: string };
export type ReportedReview = { id: string; business: string; author: string; rating: number; body: string; reason: string };
export type MyPromotion = { id: string; title: string; target: string; reach: number; redemptions: number; active: boolean; photo?: string };

export type Cart = { businessSlug: string | null; mode: OrderMode; lines: Record<string, number> };

type State = {
  role: Role | null;
  isAdmin: boolean;
  userName: string;
  userPhone: string;
  points: number;
  favorites: string[];
  cart: Cart;
  orders: Order[];
  stamps: Record<string, number>;
  userReviews: Record<string, Review[]>;
  quotes: Quote[];
  // negocio
  biz: { abierto: boolean; pedidos: boolean; domicilio: boolean };
  myItems: CatalogItem[];
  sales: Sale[];
  incoming: Order[];
  replies: Record<string, string>;
  myPromotions: MyPromotion[];
  supplyRequests: SupplyRequest[];
  providerInbox: ProviderRequest[];
  myAds: AdCampaign[];
  // repartidor
  courierAvailable: boolean;
  jobs: DeliveryJob[];
  // administración
  pendingBusinesses: PendingBusiness[];
  reportedReviews: ReportedReview[];
  campaigns: AdCampaign[];
  feedWeights: { afinidad: number; cercania: number; calificacion: number; urgencia: number; abierto: number };
};

const myBusiness = BUSINESSES.find((b) => b.slug === MY_BUSINESS_SLUG) as Business;

const initialState: State = {
  role: null,
  isAdmin: false,
  userName: 'Ana',
  userPhone: '442 318 0094',
  points: 1240,
  favorites: ['despacho-contable-reyes', 'lic-mariana-ortiz'],
  cart: { businessSlug: null, mode: 'en_local', lines: {} },
  orders: INITIAL_ORDERS,
  stamps: { 'despacho-contable-reyes': 9, 'psic-andrea-vidal': 3 },
  userReviews: {},
  quotes: [
    {
      id: 'q1',
      businessSlug: 'ortiz-salinas-abogados',
      businessName: 'Ortiz Salinas Abogados',
      vehicle: 'Constitución de S.A.S.',
      note: 'Incluye acta constitutiva, inscripción en el Registro Público y alta en el SAT de la nueva empresa.',
      lines: [
        { name: 'Honorarios del despacho', detail: 'Redacción de estatutos y acompañamiento', price: 6500 },
        { name: 'Inscripción en Registro Público', detail: 'Derechos de gobierno', price: 1800 },
        { name: 'Contabilidad del primer mes', detail: 'Con Despacho Contable Reyes · recomendado', price: 3500, optional: true },
      ],
      status: 'por_aprobar',
      readyText: 'Lista en 5 días hábiles si apruebas esta semana',
    },
  ],
  biz: { abierto: true, pedidos: true, domicilio: true },
  myItems: myBusiness.items,
  sales: [
    { id: 's1', amount: 1200, method: 'tarjeta', customerName: 'Ana G.', customerPhone: '4423180094', createdAt: Date.now() - 50 * 60000 },
    { id: 's2', amount: 3500, method: 'transferencia', customerName: 'Taller López', createdAt: Date.now() - 95 * 60000 },
    { id: 's3', amount: 650, method: 'efectivo', customerName: 'Luis T.', createdAt: Date.now() - 130 * 60000 },
    { id: 's4', amount: 900, method: 'transferencia', createdAt: Date.now() - 180 * 60000 },
  ],
  incoming: INCOMING_ORDERS,
  replies: {},
  myPromotions: [
    { id: 'mp1', title: 'Primera asesoría fiscal sin costo', target: 'Clientes nuevos', reach: 412, redemptions: 38, active: true },
  ],
  supplyRequests: [
    {
      id: 'sr1',
      part: 'Traducción certificada',
      vehicle: 'Acta constitutiva · inglés',
      qty: 1,
      urgent: true,
      forCustomer: 'Ana G.',
      createdAt: Date.now() - 20 * 60000,
      sentTo: 6,
      responses: [
        { id: 'r1', supplier: 'Traducciones Peritas Morales', distanceKm: 1.8, rating: 4.9, hasIt: true, brand: 'Perito certificado', price: 1450, readyIn: '48 h' },
        { id: 'r2', supplier: 'Lingua Peritos', distanceKm: 3.1, rating: 4.7, hasIt: true, brand: 'Perito certificado', price: 1600, readyIn: '24 h' },
        { id: 'r3', supplier: 'Traductores del Centro', distanceKm: 2.4, rating: 4.5, hasIt: false },
      ],
    },
  ],
  providerInbox: [
    { id: 'pr1', from: 'Ortiz Salinas Abogados', distanceKm: 1.8, part: 'Contabilidad de sociedad nueva', vehicle: 'S.A.S. · inicia en noviembre', urgent: true, status: 'nueva' },
    { id: 'pr2', from: 'Lic. Mariana Ortiz', distanceKm: 0.6, part: 'Dictamen de ingresos', vehicle: 'Juicio de pensión alimenticia', urgent: false, status: 'nueva' },
  ],
  myAds: [],
  courierAvailable: true,
  jobs: [
    { id: 'j1', pickup: 'Notaría Pública 14', pickupDetail: 'A 1.1 km de ti · escritura firmada', dropoff: 'Ortiz Salinas Abogados', dropoffDetail: 'Código de entrega al llegar', km: 3.4, pay: 85, urgent: true, status: 'oferta' },
    { id: 'j2', pickup: 'Despacho Contable Reyes', pickupDetail: 'A 600 m · sobre con e.firma', dropoff: 'Calle Zen 214', dropoffDetail: 'Entregar en persona a Ana G.', km: 1.9, pay: 50, urgent: false, status: 'oferta' },
  ],
  pendingBusinesses: [
    { id: 'pb1', name: 'Lic. Fernanda Ruiz', category: 'Abogados', zone: 'Juriquilla', owner: 'Fernanda R.' },
    { id: 'pb2', name: 'Valuadores del Bajío', category: 'Arquitectura e ingeniería', zone: 'Centro Sur', owner: 'Ing. Ramos' },
    { id: 'pb3', name: 'C.P. Javier Cano', category: 'Contadores', zone: 'El Marqués', owner: 'Javier C.' },
  ],
  reportedReviews: [
    { id: 'rr1', business: 'Gestoría Trámites QRO', author: 'Usuario 2231', rating: 1, body: 'Pésimo, nunca vuelvo, el dueño es un...', reason: 'Lenguaje ofensivo' },
    { id: 'rr2', business: 'Notaría Pública 14', author: 'Usuario 1874', rating: 1, body: 'Contrata mis servicios en www…', reason: 'Spam' },
  ],
  campaigns: [
    { id: 'c1', advertiser: 'Despacho Contable Reyes', slot: 'Portada de zona', zones: 1, units: 2, total: 3132, status: 'activa' },
    { id: 'c2', advertiser: 'Ortiz Salinas Abogados', slot: 'Pin destacado', zones: 2, units: 1, total: 1879, status: 'en_revision' },
    { id: 'c3', advertiser: 'Aseguradora Ejemplo', slot: 'Marca externa', zones: 4, units: 1, total: 9744, status: 'por_pagar' },
  ],
  feedWeights: { afinidad: 40, cercania: 25, calificacion: 20, urgencia: 10, abierto: 5 },
};

// ─────────────────────────────────────────────────────────────
// Persistencia ligera del rol (localStorage existe en web y, en
// iOS/Android, lo instala expo-sqlite desde src/lib/supabase.ts)
// ─────────────────────────────────────────────────────────────
const ROLE_KEY = 'expertalia360.role';
function loadRole(): Role | null {
  try {
    const v = globalThis.localStorage?.getItem(ROLE_KEY);
    return v === 'vecino' || v === 'negocio' || v === 'repartidor' ? v : null;
  } catch {
    return null;
  }
}
function saveRole(role: Role | null) {
  try {
    if (role) globalThis.localStorage?.setItem(ROLE_KEY, role);
    else globalThis.localStorage?.removeItem(ROLE_KEY);
  } catch {
    // sin almacenamiento: el rol vive solo en memoria
  }
}

const uid = () => Math.random().toString(36).slice(2, 9);

// ─────────────────────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────────────────────
function useAppState() {
  const [state, setState] = useState<State>(() => ({ ...initialState, role: loadRole() }));
  const update = useCallback((fn: (s: State) => State) => setState(fn), []);

  useEffect(() => saveRole(state.role), [state.role]);

  const actions = useMemo(
    () => ({
      setRole: (role: Role | null) => update((s) => ({ ...s, role })),
      setAdmin: (isAdmin: boolean) => update((s) => ({ ...s, isAdmin })),
      toggleFavorite: (slug: string) =>
        update((s) => ({
          ...s,
          favorites: s.favorites.includes(slug) ? s.favorites.filter((f) => f !== slug) : [...s.favorites, slug],
        })),

      // Carrito
      setCartMode: (mode: OrderMode) => update((s) => ({ ...s, cart: { ...s.cart, mode } })),
      addToCart: (businessSlug: string, itemId: string, delta: number) =>
        update((s) => {
          const sameBiz = s.cart.businessSlug === businessSlug;
          const lines = sameBiz ? { ...s.cart.lines } : {};
          const next = Math.max(0, (lines[itemId] ?? 0) + delta);
          if (next === 0) delete lines[itemId];
          else lines[itemId] = next;
          return { ...s, cart: { ...s.cart, businessSlug: Object.keys(lines).length ? businessSlug : null, lines } };
        }),
      clearCart: () => update((s) => ({ ...s, cart: { ...s.cart, businessSlug: null, lines: {} } })),

      placeOrder: (o: { business: Business; mode: OrderMode; method: PaymentMethod; total: number; note?: string }) => {
        const id = uid();
        track(o.business, 'pedido');
        update((s) => {
          const lines = Object.entries(s.cart.lines).map(([itemId, qty]) => {
            const it = o.business.items.find((i) => i.id === itemId);
            return { itemId, name: it?.name ?? 'Producto', price: it?.price ?? 0, qty };
          });
          const count = lines.reduce((a, l) => a + l.qty, 0);
          const modeText = o.mode === 'domicilio' ? 'A domicilio' : o.mode === 'para_llevar' ? 'En despacho' : 'En línea';
          const order: Order = {
            id,
            type: 'pedido',
            businessSlug: o.business.slug,
            businessName: o.business.name,
            detail: `${modeText} · ${count} ${count === 1 ? 'producto' : 'productos'}`,
            total: o.total,
            status: 'recibido',
            createdAt: Date.now(),
            lines,
            mode: o.mode,
            paymentMethod: o.method,
            deliveryNote: o.note,
            customerName: `${s.userName} G.`,
          };
          const incoming = o.business.slug === MY_BUSINESS_SLUG ? [order, ...s.incoming] : s.incoming;
          return { ...s, orders: [order, ...s.orders], incoming, cart: { ...s.cart, businessSlug: null, lines: {} } };
        });
        return id;
      },

      bookAppointment: (b: { business: Business; item: CatalogItem; staff: string; label: string; total: number }) => {
        track(b.business, 'reserva');
        update((s) => ({
          ...s,
          orders: [
            {
              id: uid(),
              type: 'cita',
              businessSlug: b.business.slug,
              businessName: b.business.name,
              detail: `${b.label} · ${b.item.name}${b.staff !== 'Cualquiera' ? ` con ${b.staff}` : ''}`,
              total: b.total,
              status: 'confirmada',
              createdAt: Date.now(),
            },
            ...s.orders,
          ],
        }));
      },

      requestQuote: (q: { business: Business; item?: CatalogItem; description: string }) => {
        track(q.business, 'cotizacion');
        update((s) => ({
          ...s,
          orders: [
            {
              id: uid(),
              type: 'cotizacion',
              businessSlug: q.business.slug,
              businessName: q.business.name,
              detail: `${q.item?.name ?? 'Cotización'} · ${q.description.slice(0, 40)}`,
              total: 0,
              status: 'esperando',
              createdAt: Date.now(),
            },
            ...s.orders,
          ],
        }));
      },

      setQuoteStatus: (id: string, status: Quote['status']) =>
        update((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === id ? { ...q, status } : q)) })),

      addReview: (businessSlug: string, rating: number, body: string, orderId?: string) =>
        update((s) => ({
          ...s,
          points: s.points + 50,
          userReviews: {
            ...s.userReviews,
            [businessSlug]: [
              { id: uid(), author: `${s.userName} G.`, rating, body, verified: Boolean(orderId), dateLabel: 'ahora' },
              ...(s.userReviews[businessSlug] ?? []),
            ],
          },
          orders: orderId ? s.orders.map((o) => (o.id === orderId ? { ...o, rated: true } : o)) : s.orders,
        })),

      // Negocio
      toggleBiz: (key: keyof State['biz']) => update((s) => ({ ...s, biz: { ...s.biz, [key]: !s.biz[key] } })),
      addItem: (item: Omit<CatalogItem, 'id'>) => {
        const created = { ...item, id: uid() };
        // Lo publicado aparece de inmediato en el menú del negocio
        if (!myBusiness.items.some((i) => i.id === created.id)) myBusiness.items.push(created);
        update((s) => ({ ...s, myItems: s.myItems.some((i) => i.id === created.id) ? s.myItems : [...s.myItems, created] }));
      },
      toggleItem: (id: string) =>
        update((s) => ({ ...s, myItems: s.myItems.map((i) => (i.id === id ? { ...i, available: !i.available } : i)) })),
      registerSale: (sale: { amount: number; method: PaymentMethod; customerPhone?: string; customerName?: string }) =>
        update((s) => {
          const stamps = sale.customerPhone ? { ...s.stamps, [MY_BUSINESS_SLUG]: (s.stamps[MY_BUSINESS_SLUG] ?? 0) + 1 } : s.stamps;
          return { ...s, stamps, sales: [{ ...sale, id: uid(), createdAt: Date.now() }, ...s.sales] };
        }),
      advanceIncoming: (id: string) =>
        update((s) => ({
          ...s,
          incoming: s.incoming.map((o) => {
            if (o.id !== id) return o;
            const flow: Order['status'][] = ['recibido', 'preparando', 'en_camino', 'entregado'];
            const i = flow.indexOf(o.status);
            const next = flow[Math.min(i + 1, flow.length - 1)];
            return { ...o, status: o.mode !== 'domicilio' && next === 'en_camino' ? 'entregado' : next };
          }),
          orders: s.orders.map((o) => {
            if (o.id !== id) return o;
            const flow: Order['status'][] = ['recibido', 'preparando', 'en_camino', 'entregado'];
            const i = flow.indexOf(o.status);
            return { ...o, status: flow[Math.min(i + 1, flow.length - 1)] };
          }),
        })),
      rejectIncoming: (id: string) =>
        update((s) => ({ ...s, incoming: s.incoming.map((o) => (o.id === id ? { ...o, status: 'cancelado' } : o)) })),
      replyReview: (reviewId: string, text: string) => update((s) => ({ ...s, replies: { ...s.replies, [reviewId]: text } })),
      addPromotion: (p: Omit<MyPromotion, 'id' | 'redemptions' | 'active'>) => {
        const id = uid();
        // También sale en "Tus promociones" del inicio de los vecinos
        PROMOTIONS.unshift({ id, title: myBusiness.name, subtitle: p.title, badge: 'NUEVA', kind: 'negocio', businessSlug: myBusiness.slug, photo: p.photo });
        update((s) => ({ ...s, myPromotions: [{ ...p, id, redemptions: 0, active: true }, ...s.myPromotions] }));
      },
      togglePromotion: (id: string) =>
        update((s) => ({ ...s, myPromotions: s.myPromotions.map((p) => (p.id === id ? { ...p, active: !p.active } : p)) })),

      // Red entre negocios
      createSupplyRequest: (r: { part: string; vehicle: string; qty: number; urgent: boolean; forCustomer?: string }) => {
        const id = uid();
        update((s) => ({
          ...s,
          supplyRequests: [
            {
              ...r,
              id,
              createdAt: Date.now(),
              sentTo: 5,
              responses: [
                { id: uid(), supplier: 'Traducciones Peritas Morales', distanceKm: 1.8, rating: 4.9, hasIt: true, brand: 'Perito certificado', price: 1450, readyIn: '48 h' },
                { id: uid(), supplier: 'Valuadores del Bajío', distanceKm: 3.1, rating: 4.7, hasIt: true, brand: 'Perito valuador', price: 2200, readyIn: '3 días' },
              ],
            },
            ...s.supplyRequests,
          ],
        }));
        return id;
      },
      chooseSupplier: (requestId: string, responseId: string) =>
        update((s) => ({
          ...s,
          supplyRequests: s.supplyRequests.map((r) => (r.id === requestId ? { ...r, chosenId: responseId } : r)),
        })),
      answerProvider: (id: string, answer: { hasIt: boolean; price?: number; readyIn?: string }) =>
        update((s) => ({
          ...s,
          providerInbox: s.providerInbox.map((p) =>
            p.id === id
              ? answer.hasIt
                ? { ...p, status: 'ofertada', offerPrice: answer.price, readyIn: answer.readyIn }
                : { ...p, status: 'no_tengo' }
              : p,
          ),
        })),

      // Publicidad
      buyAd: (ad: Omit<AdCampaign, 'id' | 'status'>) =>
        update((s) => {
          const c: AdCampaign = { ...ad, id: uid(), status: 'en_revision' };
          return { ...s, myAds: [c, ...s.myAds], campaigns: [c, ...s.campaigns] };
        }),

      // Repartidor
      setCourierAvailable: (v: boolean) => update((s) => ({ ...s, courierAvailable: v })),
      setJobStatus: (id: string, status: DeliveryJob['status']) =>
        update((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)) })),

      // Administración
      approveBusiness: (id: string) => update((s) => ({ ...s, pendingBusinesses: s.pendingBusinesses.filter((b) => b.id !== id) })),
      resolveReport: (id: string) => update((s) => ({ ...s, reportedReviews: s.reportedReviews.filter((r) => r.id !== id) })),
      createCampaign: (c: Omit<AdCampaign, 'id' | 'status'>) =>
        update((s) => ({ ...s, campaigns: [{ ...c, id: uid(), status: 'por_pagar' }, ...s.campaigns] })),
      setCampaignStatus: (id: string, status: AdCampaign['status']) =>
        update((s) => {
          // Al aprobar un anuncio al abrir la app, entra a la rotación
          const c = s.campaigns.find((x) => x.id === id);
          if (c?.opening && status === 'activa' && !OPENING_ADS.some((a) => a.id === c.opening!.id)) OPENING_ADS.push(c.opening);
          const sync = (x: AdCampaign) => (x.id === id ? { ...x, status } : x);
          return { ...s, campaigns: s.campaigns.map(sync), myAds: s.myAds.map(sync) };
        }),
      setWeight: (key: keyof State['feedWeights'], value: number) =>
        update((s) => ({ ...s, feedWeights: { ...s.feedWeights, [key]: Math.max(0, Math.min(100, value)) } })),
    }),
    [update],
  );

  return { state, actions };
}

type AppContextValue = ReturnType<typeof useAppState>;
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

export { myBusiness };
