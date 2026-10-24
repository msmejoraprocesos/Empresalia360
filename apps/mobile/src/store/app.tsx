import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { OPENING_ADS, type OpeningAd } from '@/data/ads';
import { HIDDEN } from '@/data';
import { BUSINESSES, INCOMING_REQUESTS, INITIAL_ORDERS, MY_BUSINESS_SLUG, POSTS, PROMOTIONS, QUESTIONS } from '@/data/mock';
import { addMonths, billingStatus, demoBilling, isoDate, parseDate, today, type Billing, type PlanId, type SubPayment } from '@/data/billing';
import { loadAccount, loadBilling, loadCommunity, remote, saveBusiness, type AccountData } from '@/data/remote';
import { track } from '@/lib/analytics';
import { uploadPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
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

export type PendingBusiness = { id: string; name: string; category: string; zone: string; owner: string; license?: string };
export type ReportedReview = { id: string; business: string; author: string; rating: number; body: string; reason: string };

/** Lo que el profesional puede cambiar de su perfil */
export type ProfilePatch = Partial<
  Pick<
    Business,
    | 'name'
    | 'categorySlug'
    | 'categorySlugs'
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
    | 'paymentInfo'
  >
>;

export type LookingFor = 'profesionales' | 'oficios';

/** Persona que entró con su correo (solo con Supabase conectado) */
export type Account = { userId: string; email?: string; name: string; businessSlug: string | null };

type State = {
  role: Role | null;
  account: Account | null;
  /** Qué busca el cliente: lo elige en el inicio y se respeta en búsqueda y mapa */
  lookingFor: LookingFor;
  /** Ya eligió mundo al menos una vez */
  worldChosen: boolean;
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
  /** Respuestas que marcó como útiles (ids de Supabase) */
  helpfulIds: string[];
  // profesional
  profileVersion: number;
  biz: { disponible: boolean; nuevosClientes: boolean; enLinea: boolean };
  myItems: CatalogItem[];
  sales: Sale[];
  requests: IncomingRequest[];
  /** Citas que el profesional anota a mano (día AAAA-MM-DD) y horarios bloqueados ("día-hora") */
  agenda: { day: string; time: string; who: string; what: string }[];
  blocked: string[];
  /** Reseñas que el profesional reportó */
  reportedByMe: string[];
  /** Campañas globales a las que se sumó el profesional */
  joinedCampaigns: string[];
  /** Mensualidad de cada negocio (por slug) */
  billing: Record<string, Billing>;
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

// Perfil profesional que se edita en "Mi negocio". Sin Supabase es el perfil de ejemplo; con
// sesión es el perfil de la persona, o uno en blanco si todavía no lo crea.
let myBusiness = BUSINESSES.find((b) => b.slug === MY_BUSINESS_SLUG) as Business;
const demoBusiness = myBusiness;

function blankBusiness(name: string): Business {
  return {
    id: 'nuevo', slug: 'mi-perfil', name, categorySlug: 'abogados', subtitle: '', description: '', address: '', zone: demoBusiness.zone,
    lat: demoBusiness.lat, lng: demoBusiness.lng, rating: 0, ratingCount: 0, isOpen: true, closesAt: '18:00', phone: '', profession: '',
    specialties: [], yearsExp: 0, languages: ['Español'], attends: ['despacho'], modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false, verified: false, items: [], reviews: [], gallery: [],
  };
}

const online = supabase !== null;

const initialState: State = {
  role: null,
  account: null,
  lookingFor: 'profesionales',
  worldChosen: false,
  isAdmin: false,
  userName: 'Ana',
  userPhone: '442 318 0094',
  points: 1240,
  favorites: ['plomeria-hernandez', 'despacho-contable-reyes'],
  cart: { businessSlug: null, mode: 'para_llevar', lines: {} },
  // Con Supabase, las citas y solicitudes reales llegan al entrar
  orders: online ? [] : INITIAL_ORDERS,
  stamps: { 'despacho-contable-reyes': 9, 'plomeria-hernandez': 2, 'lic-mariana-ortiz': 1 },
  userReviews: {},
  quotes: online ? [] : [
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
  helpfulIds: [],
  profileVersion: 0,
  biz: { disponible: true, nuevosClientes: true, enLinea: true },
  myItems: myBusiness.items,
  sales: online ? [] : [
    { id: 's1', amount: 500, method: 'tarjeta', customerName: 'Ana G.', concept: 'Consulta inicial', customerPhone: '4423180094', createdAt: Date.now() - 50 * 60000 },
    { id: 's2', amount: 7000, method: 'transferencia', customerName: 'Lucía P.', concept: 'Divorcio voluntario · anticipo', createdAt: Date.now() - 95 * 60000 },
    { id: 's3', amount: 500, method: 'efectivo', customerName: 'Pedro S.', concept: 'Consulta inicial', createdAt: Date.now() - 130 * 60000 },
  ],
  requests: online ? [] : INCOMING_REQUESTS,
  replies: {},
  agenda: [],
  blocked: [],
  reportedByMe: [],
  joinedCampaigns: [],
  billing: online ? {} : demoBilling(BUSINESSES),
  myAds: [],
  myPromotions: online ? [] : [{ id: 'mp1', title: 'Primera consulta en línea a $350', target: 'Clientes nuevos', reach: 412, redemptions: 38, active: true }],
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
    { id: 'pb1', name: 'Lic. Fernanda Ruiz', category: 'Abogados', zone: 'Juriquilla', owner: 'Fernanda R.', license: 'Cédula 11234567 · Licenciatura en Derecho' },
    { id: 'pb2', name: 'Valuadores del Bajío', category: 'Arquitectura e ingeniería', zone: 'Centro Sur', owner: 'Ing. Ramos', license: 'Cédula 8456120 · Ingeniería Civil' },
    { id: 'pb3', name: 'Electricista Saúl Cano', category: 'Electricidad', zone: 'El Marqués', owner: 'Saúl C.', license: 'Certificado CONOCER EC0586 · instalaciones eléctricas' },
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
const WORLD_KEY = 'expertalia360.mundo';
function loadWorld(): LookingFor | null {
  try {
    const v = globalThis.localStorage?.getItem(WORLD_KEY);
    return v === 'profesionales' || v === 'oficios' ? v : null;
  } catch {
    return null;
  }
}
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

/** Convierte ids de respuestas útiles en las llaves "pregunta:índice" que usan las pantallas */
function helpfulKeys(questions: Question[], ids: string[]): string[] {
  const keys: string[] = [];
  for (const q of questions) q.answers.forEach((a, i) => a.id && ids.includes(a.id) && keys.push(`${q.id}:${i}`));
  return keys;
}

// ─────────────────────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────────────────────
function useAppState() {
  const [state, setState] = useState<State>(() => {
    const world = loadWorld();
    for (const [slug, b] of Object.entries(initialState.billing)) if (billingStatus(b) === 'suspendido') HIDDEN.add(slug);
    return { ...initialState, role: loadRole(), lookingFor: world ?? initialState.lookingFor, worldChosen: Boolean(world) };
  });
  const update = useCallback((fn: (s: State) => State) => setState(fn), []);

  useEffect(() => saveRole(state.role), [state.role]);
  // Los perfiles suspendidos por falta de pago se ocultan del directorio
  useEffect(() => {
    HIDDEN.clear();
    for (const [slug, b] of Object.entries(state.billing)) if (billingStatus(b) === 'suspendido') HIDDEN.add(slug);
  }, [state.billing]);
  useEffect(() => {
    if (!state.worldChosen) return;
    try {
      globalThis.localStorage?.setItem(WORLD_KEY, state.lookingFor);
    } catch {
      // sin almacenamiento: se elige cada vez
    }
  }, [state.lookingFor, state.worldChosen]);

  // ── Supabase: cuenta, citas y solicitudes de quien entró ──
  const refreshCommunity = useCallback(async () => {
    const r = await loadCommunity();
    if (r) update((s) => ({ ...s, posts: r.posts, questions: r.questions, helpful: helpfulKeys(r.questions, s.helpfulIds) }));
  }, [update]);

  const applyAccount = useCallback(
    (acc: AccountData | null) => {
      if (!acc) {
        myBusiness = demoBusiness;
        update((s) => ({ ...s, account: null, orders: [], requests: [], likedPosts: [], helpful: [], helpfulIds: [], myItems: myBusiness.items, profileVersion: s.profileVersion + 1 }));
        return;
      }
      const own = acc.businessSlug ? BUSINESSES.find((b) => b.slug === acc.businessSlug) : undefined;
      myBusiness = own ?? blankBusiness(acc.name);
      update((s) => ({
        ...s,
        account: { userId: acc.userId, email: acc.email, name: acc.name, businessSlug: acc.businessSlug },
        userName: acc.name.split(' ')[0] || s.userName,
        orders: acc.orders,
        requests: acc.requests,
        likedPosts: acc.likedPosts,
        helpfulIds: acc.helpfulAnswers,
        helpful: helpfulKeys(s.questions, acc.helpfulAnswers),
        myItems: myBusiness.items,
        profileVersion: s.profileVersion + 1,
      }));
    },
    [update],
  );

  const refreshBilling = useCallback(async () => {
    const billing = await loadBilling();
    if (billing) update((s) => ({ ...s, billing }));
  }, [update]);

  const refreshAccount = useCallback(async () => {
    applyAccount(await loadAccount());
    void refreshBilling();
  }, [applyAccount, refreshBilling]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Las llamadas a Supabase van fuera del aviso (así lo pide la librería)
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => (session ? refreshAccount() : applyAccount(null)), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [applyAccount, refreshAccount]);

  const actions = useMemo(
    () => ({
      refreshAccount,
      refreshCommunity,
      setRole: (role: Role | null) => update((s) => ({ ...s, role })),
      setAdmin: (isAdmin: boolean) => update((s) => ({ ...s, isAdmin })),
      setLookingFor: (lookingFor: LookingFor) => update((s) => ({ ...s, lookingFor, worldChosen: true })),
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
          if (online) {
            remote
              .request({ business: o.business, type: 'contratacion', detail, when: 'Pagado ahora', amount: o.total, paymentMethod: o.method, attend: o.mode === 'domicilio' ? 'domicilio' : o.mode === 'en_local' ? 'en_linea' : 'despacho', specialty: lines[0]?.name })
              .then(() => refreshAccount());
          }
          const requests: IncomingRequest[] =
            !online && o.business.slug === myBusiness.slug
              ? [{ id, type: 'contratacion', customer: `${s.userName} G.`, specialty: lines[0]?.name ?? '', detail, when: 'Pagado ahora', attend: o.mode === 'domicilio' ? 'domicilio' : o.mode === 'en_local' ? 'en_linea' : 'despacho', status: 'nueva', amount: o.total, paymentMethod: o.method }, ...s.requests]
              : s.requests;
          return { ...s, points: s.points + 20, orders: [order, ...s.orders], requests, cart: { ...s.cart, businessSlug: null, lines: {} } };
        });
        return id;
      },

      // Cliente
      bookAppointment: (b: { business: Business; item: CatalogItem; staff: string; label: string; total: number }) => {
        track(b.business, 'reserva');
        if (online) {
          remote
            .request({ business: b.business, type: 'cita', detail: `${b.item.name}${b.staff !== 'Cualquiera' ? ` con ${b.staff}` : ''}`, when: b.label, specialty: b.business.specialties[0], itemId: b.item.id, amount: b.total || undefined })
            .then(() => refreshAccount());
        }
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
            !online && b.business.slug === myBusiness.slug
              ? [{ id: order.id, type: 'cita', customer: `${s.userName} G.`, specialty: b.business.specialties[0] ?? '', detail: b.item.name, when: b.label, attend: b.business.attends[0], status: 'nueva' }, ...s.requests]
              : s.requests;
          return { ...s, orders: [order, ...s.orders], requests };
        });
      },

      requestQuote: (q: { business: Business; item?: CatalogItem; description: string; photo?: string }) => {
        track(q.business, 'cotizacion');
        if (online) {
          remote
            .request({ business: q.business, type: 'cotizacion', detail: `${q.item?.name ?? 'Cotización'} · ${q.description}`, when: 'Recibida ahora', specialty: q.item?.section ?? q.business.specialties[0], itemId: q.item?.id })
            .then(() => refreshAccount());
        }
        update((s) => {
          const id = uid();
          const requests: IncomingRequest[] =
            !online && q.business.slug === myBusiness.slug
              ? [{ id, type: 'cotizacion', photo: q.photo, customer: `${s.userName} G.`, specialty: q.item?.section ?? q.business.specialties[0] ?? '', detail: `${q.item?.name ?? 'Cotización'} · ${q.description}`, when: 'Recibida ahora', attend: q.business.attends[0], status: 'nueva' }, ...s.requests]
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

      addReview: (businessSlug: string, rating: number, body: string, orderId?: string) => {
        const target = BUSINESSES.find((b) => b.slug === businessSlug);
        if (online && target) void remote.review(target, rating, body);
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
        }));
      },

      // Comunidad
      toggleLike: (postId: string) =>
        update((s) => {
          const liked = s.likedPosts.includes(postId);
          if (online) void remote.like(postId, !liked);
          return {
            ...s,
            likedPosts: liked ? s.likedPosts.filter((p) => p !== postId) : [...s.likedPosts, postId],
            posts: s.posts.map((p) => (p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p)),
          };
        }),
      addComment: (postId: string, author: string, body: string) => {
        if (online) void remote.comment(postId, body);
        update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, { author, body }] } : p)) }));
      },
      askQuestion: (q: { categorySlug: string; specialty?: string; body: string }) => {
        if (online) void remote.ask(q.categorySlug, q.body, q.specialty).then((ok) => { if (ok) void refreshCommunity(); });
        update((s) => ({ ...s, questions: [{ ...q, id: uid(), author: `${s.userName} G.`, dateLabel: 'ahora', answers: [] }, ...s.questions] }));
      },
      answerQuestion: (questionId: string, body: string) => {
        if (online) void remote.answer(questionId, myBusiness, body).then((ok) => { if (ok) void refreshCommunity(); });
        update((s) => ({
          ...s,
          questions: s.questions.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, { businessSlug: myBusiness.slug, body, helpful: 0 }] } : q)),
        }));
      },
      markHelpful: (questionId: string, index: number) =>
        update((s) => {
          const key = `${questionId}:${index}`;
          if (s.helpful.includes(key)) return s;
          if (online) void remote.helpful(s.questions.find((q) => q.id === questionId)?.answers[index]?.id);
          return {
            ...s,
            helpful: [...s.helpful, key],
            questions: s.questions.map((q) => (q.id === questionId ? { ...q, answers: q.answers.map((a, i) => (i === index ? { ...a, helpful: a.helpful + 1 } : a)) } : q)),
          };
        }),
      publishPost: (p: Omit<Post, 'id' | 'businessSlug' | 'dateLabel' | 'likes' | 'comments'>) => {
        if (online) void remote.post(myBusiness, p).then((ok) => { if (ok) void refreshCommunity(); });
        update((s) => ({
          ...s,
          posts: [{ ...p, id: uid(), businessSlug: myBusiness.slug, dateLabel: 'ahora', likes: 0, comments: [] }, ...s.posts],
        }));
      },

      // Profesional
      /** Guarda el perfil. Regresa true si quedó guardado en línea, false si falló y null si no hay Supabase o sesión. */
      saveProfile: async (patch: ProfilePatch): Promise<boolean | null> => {
        // El perfil se actualiza en el directorio y aparece de inmediato en las búsquedas
        Object.assign(myBusiness, patch);
        update((s) => ({ ...s, profileVersion: s.profileVersion + 1 }));
        if (!online) return null;
        const saved = await saveBusiness(myBusiness, patch, (uri, folder, slug) => uploadPhoto(uri, folder, slug));
        if (!saved) return false;
        const existing = BUSINESSES.find((b) => b.slug === saved.slug);
        if (existing) Object.assign(existing, saved);
        else BUSINESSES.push(Object.assign(myBusiness, saved));
        myBusiness = existing ?? myBusiness;
        await refreshAccount();
        return true;
      },
      claimProfile: (business: Business, license?: string) => remote.claim(business, license),
      setName: (name: string) => {
        if (online) void remote.setName(name);
        update((s) => ({ ...s, userName: name.split(' ')[0] || s.userName, account: s.account ? { ...s.account, name } : s.account }));
      },
      toggleBiz: (key: keyof State['biz']) =>
        update((s) => {
          const v = !s.biz[key];
          if (online && key === 'disponible') void remote.setAvailability(myBusiness, { available: v });
          if (online && key === 'nuevosClientes') void remote.setAvailability(myBusiness, { accepts_new: v });
          return { ...s, biz: { ...s.biz, [key]: v } };
        }),
      addItem: (item: Omit<CatalogItem, 'id'>) => {
        const created = { ...item, id: uid() };
        if (!myBusiness.items.some((i) => i.id === created.id)) myBusiness.items.push(created);
        update((s) => ({ ...s, myItems: s.myItems.some((i) => i.id === created.id) ? s.myItems : [...s.myItems, created] }));
      },
      toggleItem: (id: string) =>
        update((s) => ({ ...s, myItems: s.myItems.map((i) => (i.id === id ? { ...i, available: !i.available } : i)) })),
      registerSale: (sale: { amount: number; method: PaymentMethod; customerPhone?: string; customerName?: string; concept?: string; fromApp?: boolean }) => {
        if (online) void remote.sale(myBusiness, sale);
        update((s) => {
          // Si es un cliente de la app, se le suma una visita en su tarjeta de lealtad
          const stamps = sale.fromApp ? { ...s.stamps, [myBusiness.slug]: (s.stamps[myBusiness.slug] ?? 0) + 1 } : s.stamps;
          const { fromApp: _fromApp, ...rest } = sale;
          return { ...s, stamps, sales: [{ ...rest, id: uid(), createdAt: Date.now() }, ...s.sales] };
        });
      },
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
      respondRequest: (id: string, status: IncomingRequest['status'], quotedPrice?: number) => {
        if (online) void remote.respondRequest(id, status, quotedPrice);
        update((s) => ({
          ...s,
          requests: s.requests.map((r) => (r.id === id ? { ...r, status, quotedPrice: quotedPrice ?? r.quotedPrice } : r)),
          // Lo ve también el cliente en "Mis citas"
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: status === 'rechazada' ? 'cancelado' : status === 'cotizada' ? 'esperando' : 'confirmada', total: quotedPrice ?? o.total } : o,
          ),
        }));
      },
      addAgenda: (a: { day: string; time: string; who: string; what: string }) => update((s) => ({ ...s, agenda: [...s.agenda, a] })),
      toggleBlocked: (key: string) => update((s) => ({ ...s, blocked: s.blocked.includes(key) ? s.blocked.filter((b) => b !== key) : [...s.blocked, key] })),
      // ── Mensualidades ──
      /** El negocio avisa que pagó; queda "por confirmar" hasta que el administrador lo revise */
      reportSubPayment: (slug: string, p: Omit<SubPayment, 'id' | 'status' | 'createdAt'>) => {
        const pay: SubPayment = { ...p, id: uid(), status: 'pendiente', createdAt: Date.now() };
        if (online) void remote.reportSubPayment(slug, pay).then(() => refreshBilling());
        update((s) => {
          const b = s.billing[slug] ?? { plan: 'estandar' as PlanId, payments: [] };
          return { ...s, billing: { ...s.billing, [slug]: { ...b, payments: [pay, ...b.payments] } } };
        });
      },
      /** Administrador: confirma el pago y recorre la fecha "pagado hasta" */
      confirmSubPayment: (slug: string, paymentId: string) => {
        if (online) void remote.confirmSubPayment(paymentId).then(() => refreshBilling());
        update((s) => {
          const b = s.billing[slug];
          const p = b?.payments.find((x) => x.id === paymentId);
          if (!b || !p) return s;
          const start = b.paidUntil && parseDate(b.paidUntil) > today() ? parseDate(b.paidUntil) : today();
          const end = isoDate(addMonths(start, p.months));
          const payments = b.payments.map((x) => (x.id === paymentId ? { ...x, status: 'pagado' as const, periodEnd: end } : x));
          return { ...s, billing: { ...s.billing, [slug]: { plan: p.plan, paidUntil: end, payments } } };
        });
      },
      rejectSubPayment: (slug: string, paymentId: string) => {
        if (online) void remote.rejectSubPayment(paymentId).then(() => refreshBilling());
        update((s) => {
          const b = s.billing[slug];
          if (!b) return s;
          return { ...s, billing: { ...s.billing, [slug]: { ...b, payments: b.payments.map((x) => (x.id === paymentId ? { ...x, status: 'rechazado' as const } : x)) } } };
        });
      },
      /** Administrador: registra un pago que recibió directo (efectivo, depósito) y lo da por bueno */
      registerSubPayment: (slug: string, plan: PlanId, months: number, amount: number, method: SubPayment['method']) => {
        if (online) {
          void remote.adminRegisterSubPayment(slug, { plan, months, amount, method }).then(() => refreshBilling());
          return;
        }
        update((s) => {
          const b = s.billing[slug] ?? { plan, payments: [] };
          const start = b.paidUntil && parseDate(b.paidUntil) > today() ? parseDate(b.paidUntil) : today();
          const end = isoDate(addMonths(start, months));
          const pay: SubPayment = { id: uid(), plan, months, amount, method, reference: 'Registrado por el administrador', status: 'pagado', createdAt: Date.now(), periodEnd: end };
          return { ...s, billing: { ...s.billing, [slug]: { plan, paidUntil: end, payments: [pay, ...b.payments] } } };
        });
      },
      refreshBilling,
      toggleCampaign: (id: string) =>
        update((s) => ({ ...s, joinedCampaigns: s.joinedCampaigns.includes(id) ? s.joinedCampaigns.filter((c) => c !== id) : [...s.joinedCampaigns, id] })),
      reportReview: (reviewId: string) => update((s) => ({ ...s, reportedByMe: s.reportedByMe.includes(reviewId) ? s.reportedByMe : [...s.reportedByMe, reviewId] })),
      replyReview: (reviewId: string, text: string) => {
        if (online) void remote.replyReview(reviewId, text);
        update((s) => ({ ...s, replies: { ...s.replies, [reviewId]: text } }));
      },

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
    [update, refreshAccount, refreshCommunity, refreshBilling],
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
