import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { OPENING_ADS, type OpeningAd } from '@/data/ads';
import { BUSINESSES, INCOMING_REQUESTS, INITIAL_ORDERS, MY_BUSINESS_SLUG, POSTS, PROMOTIONS, QUESTIONS } from '@/data/mock';
import { track } from '@/lib/analytics';
import type { Business, CatalogItem, IncomingRequest, Order, OrderMode, PaymentMethod, Post, Question, Review, Role, Sale } from '@/data/types';

// ─────────────────────────────────────────────────────────────
// Tipos del estado
// ─────────────────────────────────────────────────────────────
export type Quote = {
  id: string;
  businessSlug: string;
  businessName: string;
  /** Asunto de la cotización */
  vehicle: string;
  note: string;
  lines: { name: string; detail: string; price: number; optional?: boolean }[];
  status: 'por_aprobar' | 'aprobado' | 'rechazado';
  readyText: string;
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

export type SupplyResponse = { id: string; supplier: string; distanceKm: number; rating: number; hasIt: boolean; brand?: string; price?: number; readyIn?: string };
/** Encargo a la red de expertos (ej. un abogado pide un perito traductor) */
export type SupplyRequest = { id: string; part: string; vehicle: string; qty: number; urgent: boolean; forCustomer?: string; createdAt: number; sentTo: number; responses: SupplyResponse[]; chosenId?: string };
/** Encargo que otro experto le hace a este profesional */
export type ProviderRequest = { id: string; from: string; distanceKm: number; part: string; vehicle: string; urgent: boolean; status: 'nueva' | 'ofertada' | 'no_tengo'; offerPrice?: number; readyIn?: string };
export type MyPromotion = { id: string; title: string; target: string; reach: number; redemptions: number; active: boolean; photo?: string };
export type Cart = { businessSlug: string | null; mode: OrderMode; lines: Record<string, number> };

export type PendingBusiness = { id: string; name: string; category: string; zone: string; owner: string };
export type ReportedReview = { id: string; business: string; author: string; rating: number; body: string; reason: string };

/** Lo que el profesional puede cambiar de su perfil */
export type ProfilePatch = Partial<
  Pick<
    Business,
    | 'name'
    | 'categorySlug'
    | 'profession'
    | 'specialties'
    | 'yearsExp'
    | 'license'
    | 'education'
    | 'languages'
    | 'attends'
    | 'consultPrice'
    | 'description'
    | 'address'
    | 'zone'
    | 'phone'
    | 'subtitle'
    | 'photo'
    | 'cover'
    | 'gallery'
    | 'references'
    | 'urgent24'
    | 'warranty'
  >
>;

export type LookingFor = 'todo' | 'profesionales' | 'oficios';

type State = {
  role: Role | null;
  /** Qué busca el cliente: lo elige en el inicio y se respeta en búsqueda y mapa */
  lookingFor: LookingFor;
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
  posts: Post[];
  likedPosts: string[];
  questions: Question[];
  helpful: string[];
  // profesional
  profileVersion: number;
  biz: { disponible: boolean; nuevosClientes: boolean; enLinea: boolean };
  myItems: CatalogItem[];
  sales: Sale[];
  requests: IncomingRequest[];
  replies: Record<string, string>;
  myAds: AdCampaign[];
  myPromotions: MyPromotion[];
  supplyRequests: SupplyRequest[];
  providerInbox: ProviderRequest[];
  // administración
  pendingBusinesses: PendingBusiness[];
  reportedReviews: ReportedReview[];
  campaigns: AdCampaign[];
  feedWeights: { afinidad: number; cercania: number; calificacion: number; urgencia: number; abierto: number };
};

const myBusiness = BUSINESSES.find((b) => b.slug === MY_BUSINESS_SLUG) as Business;

const initialState: State = {
  role: null,
  lookingFor: 'todo',
  isAdmin: false,
  userName: 'Ana',
  userPhone: '442 318 0094',
  points: 1240,
  favorites: ['plomeria-hernandez', 'despacho-contable-reyes'],
  cart: { businessSlug: null, mode: 'para_llevar', lines: {} },
  orders: INITIAL_ORDERS,
  stamps: { 'despacho-contable-reyes': 9, 'plomeria-hernandez': 2, 'lic-mariana-ortiz': 1 },
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
  posts: POSTS,
  likedPosts: [],
  questions: QUESTIONS,
  helpful: [],
  profileVersion: 0,
  biz: { disponible: true, nuevosClientes: true, enLinea: true },
  myItems: myBusiness.items,
  sales: [
    { id: 's1', amount: 500, method: 'tarjeta', customerName: 'Ana G.', customerPhone: '4423180094', createdAt: Date.now() - 50 * 60000 },
    { id: 's2', amount: 7000, method: 'transferencia', customerName: 'Lucía P.', createdAt: Date.now() - 95 * 60000 },
    { id: 's3', amount: 500, method: 'efectivo', customerName: 'Pedro S.', createdAt: Date.now() - 130 * 60000 },
  ],
  requests: INCOMING_REQUESTS,
  replies: {},
  myAds: [],
  myPromotions: [{ id: 'mp1', title: 'Primera consulta en línea a $350', target: 'Clientes nuevos', reach: 412, redemptions: 38, active: true }],
  supplyRequests: [
    {
      id: 'sr1',
      part: 'Traducción certificada',
      vehicle: 'Acta de matrimonio · inglés · para juicio de divorcio',
      qty: 1,
      urgent: true,
      forCustomer: 'Lucía P.',
      createdAt: Date.now() - 20 * 60000,
      sentTo: 4,
      responses: [
        { id: 'r1', supplier: 'Traducciones Peritas Morales', distanceKm: 1.8, rating: 4.9, hasIt: true, brand: 'Perito autorizado', price: 450, readyIn: '48 h' },
        { id: 'r2', supplier: 'Lingua Peritos', distanceKm: 3.1, rating: 4.7, hasIt: true, brand: 'Perito autorizado', price: 520, readyIn: '24 h' },
      ],
    },
  ],
  providerInbox: [
    { id: 'pr1', from: 'Ortiz Salinas Abogados', distanceKm: 1.8, part: 'Juicio de arrendamiento', vehicle: 'Cliente con local comercial · 6 meses de adeudo', urgent: false, status: 'nueva' },
    { id: 'pr2', from: 'Despacho Contable Reyes', distanceKm: 0.6, part: 'Testamento', vehicle: 'Cliente del despacho, 2 inmuebles', urgent: false, status: 'nueva' },
  ],
  pendingBusinesses: [
    { id: 'pb1', name: 'Lic. Fernanda Ruiz', category: 'Abogados', zone: 'Juriquilla', owner: 'Fernanda R.' },
    { id: 'pb2', name: 'Valuadores del Bajío', category: 'Arquitectura e ingeniería', zone: 'Centro Sur', owner: 'Ing. Ramos' },
    { id: 'pb3', name: 'Electricista Saúl Cano', category: 'Electricidad', zone: 'El Marqués', owner: 'Saúl C.' },
  ],
  reportedReviews: [
    { id: 'rr1', business: 'Acabados Mendoza', author: 'Usuario 2231', rating: 1, body: 'Pésimo, nunca vuelvo, el dueño es un...', reason: 'Lenguaje ofensivo' },
    { id: 'rr2', business: 'Notaría Pública 14', author: 'Usuario 1874', rating: 1, body: 'Contrata mis servicios en www…', reason: 'Spam' },
  ],
  campaigns: [
    { id: 'c1', advertiser: 'Despacho Contable Reyes', slot: 'Portada de zona', zones: 1, units: 2, total: 3132, status: 'activa' },
    { id: 'c2', advertiser: 'Plomería Hernández', slot: '1.º en su especialidad', zones: 2, units: 1, total: 1879, status: 'en_revision' },
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
    return v === 'vecino' || v === 'negocio' ? v : null;
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
      setLookingFor: (lookingFor: LookingFor) => update((s) => ({ ...s, lookingFor })),
      toggleFavorite: (slug: string) =>
        update((s) => ({
          ...s,
          favorites: s.favorites.includes(slug) ? s.favorites.filter((f) => f !== slug) : [...s.favorites, slug],
        })),

      // Contratar paquetes con precio fijo
      setCartMode: (mode: OrderMode) => update((s) => ({ ...s, cart: { ...s.cart, mode } })),
      addToCart: (businessSlug: string, itemId: string, delta: number) =>
        update((s) => {
          const lines = s.cart.businessSlug === businessSlug ? { ...s.cart.lines } : {};
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
            return { itemId, name: it?.name ?? 'Servicio', price: it?.price ?? 0, qty };
          });
          const detail = lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name)).join(', ');
          const order: Order = {
            id, type: 'pedido', businessSlug: o.business.slug, businessName: o.business.name, detail, total: o.total, status: 'recibido',
            createdAt: Date.now(), lines, mode: o.mode, paymentMethod: o.method, deliveryNote: o.note, customerName: `${s.userName} G.`,
          };
          const requests: IncomingRequest[] =
            o.business.slug === MY_BUSINESS_SLUG
              ? [{ id, type: 'contratacion', customer: `${s.userName} G.`, specialty: lines[0]?.name ?? '', detail, when: 'Pagado ahora', attend: o.mode === 'domicilio' ? 'domicilio' : o.mode === 'en_local' ? 'en_linea' : 'despacho', status: 'nueva', amount: o.total, paymentMethod: o.method }, ...s.requests]
              : s.requests;
          return { ...s, points: s.points + 20, orders: [order, ...s.orders], requests, cart: { ...s.cart, businessSlug: null, lines: {} } };
        });
        return id;
      },

      // Cliente
      bookAppointment: (b: { business: Business; item: CatalogItem; staff: string; label: string; total: number }) => {
        track(b.business, 'reserva');
        update((s) => {
          const order: Order = {
            id: uid(),
            type: 'cita',
            businessSlug: b.business.slug,
            businessName: b.business.name,
            detail: `${b.label} · ${b.item.name}${b.staff !== 'Cualquiera' ? ` con ${b.staff}` : ''}`,
            total: b.total,
            status: 'confirmada',
            createdAt: Date.now(),
          };
          // Si la cita es con el perfil de ejemplo del profesional, le llega como solicitud
          const requests: IncomingRequest[] =
            b.business.slug === MY_BUSINESS_SLUG
              ? [{ id: order.id, type: 'cita', customer: `${s.userName} G.`, specialty: b.business.specialties[0] ?? '', detail: b.item.name, when: b.label, attend: b.business.attends[0], status: 'nueva' }, ...s.requests]
              : s.requests;
          return { ...s, orders: [order, ...s.orders], requests };
        });
      },

      requestQuote: (q: { business: Business; item?: CatalogItem; description: string }) => {
        track(q.business, 'cotizacion');
        update((s) => {
          const id = uid();
          const requests: IncomingRequest[] =
            q.business.slug === MY_BUSINESS_SLUG
              ? [{ id, type: 'cotizacion', customer: `${s.userName} G.`, specialty: q.item?.section ?? q.business.specialties[0] ?? '', detail: `${q.item?.name ?? 'Cotización'} · ${q.description}`, when: 'Recibida ahora', attend: q.business.attends[0], status: 'nueva' }, ...s.requests]
              : s.requests;
          return {
            ...s,
            requests,
            orders: [
              { id, type: 'cotizacion', businessSlug: q.business.slug, businessName: q.business.name, detail: `${q.item?.name ?? 'Cotización'} · ${q.description.slice(0, 40)}`, total: 0, status: 'esperando', createdAt: Date.now() },
              ...s.orders,
            ],
          };
        });
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

      // Comunidad
      toggleLike: (postId: string) =>
        update((s) => {
          const liked = s.likedPosts.includes(postId);
          return {
            ...s,
            likedPosts: liked ? s.likedPosts.filter((p) => p !== postId) : [...s.likedPosts, postId],
            posts: s.posts.map((p) => (p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p)),
          };
        }),
      addComment: (postId: string, author: string, body: string) =>
        update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, { author, body }] } : p)) })),
      askQuestion: (q: { categorySlug: string; specialty?: string; body: string }) =>
        update((s) => ({ ...s, questions: [{ ...q, id: uid(), author: `${s.userName} G.`, dateLabel: 'ahora', answers: [] }, ...s.questions] })),
      answerQuestion: (questionId: string, body: string) =>
        update((s) => ({
          ...s,
          questions: s.questions.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, { businessSlug: myBusiness.slug, body, helpful: 0 }] } : q)),
        })),
      markHelpful: (questionId: string, index: number) =>
        update((s) => {
          const key = `${questionId}:${index}`;
          if (s.helpful.includes(key)) return s;
          return {
            ...s,
            helpful: [...s.helpful, key],
            questions: s.questions.map((q) => (q.id === questionId ? { ...q, answers: q.answers.map((a, i) => (i === index ? { ...a, helpful: a.helpful + 1 } : a)) } : q)),
          };
        }),
      publishPost: (p: Omit<Post, 'id' | 'businessSlug' | 'dateLabel' | 'likes' | 'comments'>) =>
        update((s) => ({
          ...s,
          posts: [{ ...p, id: uid(), businessSlug: myBusiness.slug, dateLabel: 'ahora', likes: 0, comments: [] }, ...s.posts],
        })),

      // Profesional
      saveProfile: (patch: ProfilePatch) => {
        // El perfil se actualiza en el directorio y aparece de inmediato en las búsquedas
        Object.assign(myBusiness, patch);
        update((s) => ({ ...s, profileVersion: s.profileVersion + 1 }));
      },
      toggleBiz: (key: keyof State['biz']) => update((s) => ({ ...s, biz: { ...s.biz, [key]: !s.biz[key] } })),
      addItem: (item: Omit<CatalogItem, 'id'>) => {
        const created = { ...item, id: uid() };
        if (!myBusiness.items.some((i) => i.id === created.id)) myBusiness.items.push(created);
        update((s) => ({ ...s, myItems: s.myItems.some((i) => i.id === created.id) ? s.myItems : [...s.myItems, created] }));
      },
      toggleItem: (id: string) =>
        update((s) => ({ ...s, myItems: s.myItems.map((i) => (i.id === id ? { ...i, available: !i.available } : i)) })),
      registerSale: (sale: { amount: number; method: PaymentMethod; customerPhone?: string; customerName?: string }) =>
        update((s) => {
          // Cobrar con el celular del cliente le suma un sello en su tarjeta de lealtad
          const stamps = sale.customerPhone ? { ...s.stamps, [MY_BUSINESS_SLUG]: (s.stamps[MY_BUSINESS_SLUG] ?? 0) + 1 } : s.stamps;
          return { ...s, stamps, sales: [{ ...sale, id: uid(), createdAt: Date.now() }, ...s.sales] };
        }),
      addPromotion: (p: Omit<MyPromotion, 'id' | 'redemptions' | 'active'>) => {
        const id = uid();
        // También aparece en "Promociones" del inicio de los clientes
        PROMOTIONS.unshift({ id, title: p.title, subtitle: myBusiness.name, badge: 'NUEVA', kind: 'negocio', businessSlug: myBusiness.slug, photo: p.photo });
        update((s) => ({ ...s, myPromotions: [{ ...p, id, redemptions: 0, active: true }, ...s.myPromotions] }));
      },
      togglePromotion: (id: string) =>
        update((s) => ({ ...s, myPromotions: s.myPromotions.map((p) => (p.id === id ? { ...p, active: !p.active } : p)) })),

      // Red de expertos
      createSupplyRequest: (r: { part: string; vehicle: string; qty: number; urgent: boolean; forCustomer?: string }) => {
        const id = uid();
        update((s) => ({
          ...s,
          supplyRequests: [
            {
              ...r, id, createdAt: Date.now(), sentTo: 5,
              responses: [
                { id: uid(), supplier: 'Traducciones Peritas Morales', distanceKm: 1.8, rating: 4.9, hasIt: true, brand: 'Perito autorizado', price: 1450, readyIn: '48 h' },
                { id: uid(), supplier: 'Valuadores del Bajío', distanceKm: 3.1, rating: 4.7, hasIt: true, brand: 'Perito valuador', price: 2200, readyIn: '3 días' },
              ],
            },
            ...s.supplyRequests,
          ],
        }));
        return id;
      },
      chooseSupplier: (requestId: string, responseId: string) =>
        update((s) => ({ ...s, supplyRequests: s.supplyRequests.map((r) => (r.id === requestId ? { ...r, chosenId: responseId } : r)) })),
      answerProvider: (id: string, answer: { hasIt: boolean; price?: number; readyIn?: string }) =>
        update((s) => ({
          ...s,
          providerInbox: s.providerInbox.map((p) =>
            p.id === id ? (answer.hasIt ? { ...p, status: 'ofertada', offerPrice: answer.price, readyIn: answer.readyIn } : { ...p, status: 'no_tengo' }) : p,
          ),
        })),
      respondRequest: (id: string, status: IncomingRequest['status'], quotedPrice?: number) =>
        update((s) => ({
          ...s,
          requests: s.requests.map((r) => (r.id === id ? { ...r, status, quotedPrice: quotedPrice ?? r.quotedPrice } : r)),
          // Lo ve también el cliente en "Mis citas"
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: status === 'rechazada' ? 'cancelado' : status === 'cotizada' ? 'esperando' : 'confirmada', total: quotedPrice ?? o.total } : o,
          ),
        })),
      replyReview: (reviewId: string, text: string) => update((s) => ({ ...s, replies: { ...s.replies, [reviewId]: text } })),

      // Publicidad
      buyAd: (ad: Omit<AdCampaign, 'id' | 'status'>) =>
        update((s) => {
          const c: AdCampaign = { ...ad, id: uid(), status: 'en_revision' };
          return { ...s, myAds: [c, ...s.myAds], campaigns: [c, ...s.campaigns] };
        }),

      // Administración
      approveBusiness: (id: string) => update((s) => ({ ...s, pendingBusinesses: s.pendingBusinesses.filter((b) => b.id !== id) })),
      resolveReport: (id: string) => update((s) => ({ ...s, reportedReviews: s.reportedReviews.filter((r) => r.id !== id) })),
      createCampaign: (c: Omit<AdCampaign, 'id' | 'status'>) =>
        update((s) => ({ ...s, campaigns: [{ ...c, id: uid(), status: 'por_pagar' }, ...s.campaigns] })),
      setCampaignStatus: (id: string, status: AdCampaign['status']) =>
        update((s) => {
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
