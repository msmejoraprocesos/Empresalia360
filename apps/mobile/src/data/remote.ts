import { supabase } from '@/lib/supabase';

import { OPENING_ADS } from './ads';
import { BUSINESSES, CATEGORIES, POSTS, QUESTIONS, ZONE } from './mock';
import type { Billing, PlanId, SubPayment } from './billing';
import type { Attend, Business, CatalogItem, GalleryItem, IncomingRequest, Module, Order, PaymentMethod, Post, Question, Review } from './types';

type Row = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_open: boolean;
  delivers: boolean;
  verified: boolean;
  promo: string | null;
  rating_avg: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  profession: string | null;
  specialties: string[] | null;
  years_exp: number | null;
  license: string | null;
  education: string | null;
  languages: string[] | null;
  attends: string[] | null;
  consult_price: number | null;
  response_time: string | null;
  directions: string | null;
  urgent24: boolean | null;
  warranty: string | null;
  payment_info: string | null;
  logo_url: string | null;
  cover_url: string | null;
  available: boolean | null;
  business_photos: { id: string; url: string | null; caption: string; color: string | null; position: number }[];
  categories: { slug: string } | null;
  zones: { name: string } | null;
  business_modules: { module: string }[];
  business_hours: { weekday: number; opens: string; closes: string }[];
  staff: { name: string; active: boolean }[];
  catalog_items: {
    id: string;
    kind: CatalogItem['kind'];
    name: string;
    description: string | null;
    section: string | null;
    price: number | null;
    duration_min: number | null;
    is_available: boolean;
    position: number;
    image_url: string | null;
  }[];
  loyalty_programs: { kind: 'sellos' | 'puntos'; goal: number | null; percent: number | null; reward: string; active: boolean }[];
  reviews: { id: string; author_name: string | null; rating: number; body: string | null; verified: boolean; reply: string | null; created_at: string; hidden: boolean }[];
};

const SELECT = `
  id, slug, name, subtitle, description, address, phone, whatsapp, is_open, delivers, verified, promo,
  rating_avg, rating_count, lat, lng,
  profession, specialties, years_exp, license, education, languages, attends, consult_price, response_time,
  directions, urgent24, warranty, payment_info, logo_url, cover_url, available,
  business_photos ( id, url, caption, color, position ),
  categories ( slug ),
  zones ( name ),
  business_modules ( module ),
  business_hours ( weekday, opens, closes ),
  staff ( name, active ),
  catalog_items ( id, kind, name, description, section, price, duration_min, is_available, position, image_url ),
  loyalty_programs ( kind, goal, percent, reward, active ),
  reviews ( id, author_name, rating, body, verified, reply, created_at, hidden )
`;

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana${days < 14 ? '' : 's'}`;
  return `hace ${Math.floor(days / 30)} mes${days < 60 ? '' : 'es'}`;
}

const ATTENDS: Attend[] = ['despacho', 'en_linea', 'domicilio'];

function toBusiness(r: Row): Business {
  const today = new Date().getDay();
  const hours = r.business_hours.find((h) => h.weekday === today);
  const loyalty = r.loyalty_programs.find((l) => l.active);
  const reviews: Review[] = r.reviews
    .filter((v) => !v.hidden)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((v) => ({
      id: v.id,
      author: v.author_name ?? 'Vecino',
      rating: v.rating,
      body: v.body ?? '',
      verified: v.verified,
      dateLabel: ago(v.created_at),
      reply: v.reply ?? undefined,
    }));
  const staff = r.staff.filter((s) => s.active).map((s) => s.name);

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    categorySlug: r.categories?.slug ?? 'abogados',
    subtitle: r.subtitle ?? '',
    description: r.description ?? '',
    address: r.address ?? '',
    zone: r.zones?.name ?? ZONE.name,
    lat: r.lat ?? ZONE.lat,
    lng: r.lng ?? ZONE.lng,
    rating: Number(r.rating_avg) || 0,
    ratingCount: r.rating_count,
    isOpen: r.is_open && r.available !== false,
    closesAt: hours ? hours.closes.slice(0, 5) : '—',
    phone: r.whatsapp ?? r.phone ?? '',
    modules: r.business_modules.map((m) => m.module).filter((m): m is Module => ['reservar', 'cotizar', 'consulta'].includes(m)),
    profession: r.profession ?? r.subtitle ?? '',
    specialties: r.specialties ?? [],
    yearsExp: r.years_exp ?? 0,
    license: r.license ?? undefined,
    education: r.education ?? undefined,
    languages: r.languages?.length ? r.languages : ['Español'],
    attends: (r.attends ?? []).filter((a): a is Attend => ATTENDS.includes(a as Attend)).concat(r.attends?.length ? [] : ['despacho']),
    consultPrice: r.consult_price === null ? undefined : Number(r.consult_price),
    responseTime: r.response_time ?? undefined,
    references: r.directions ?? undefined,
    urgent24: Boolean(r.urgent24),
    warranty: r.warranty ?? undefined,
    paymentInfo: r.payment_info ?? undefined,
    photo: r.logo_url ?? undefined,
    cover: r.cover_url ?? undefined,
    gallery: [...(r.business_photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((g): GalleryItem => ({ id: g.id, caption: g.caption, uri: g.url ?? undefined, color: g.color ?? undefined })),
    delivers: r.delivers,
    verified: r.verified,
    promo: r.promo ?? undefined,
    staff: staff.length ? ['Cualquiera', ...staff] : undefined,
    loyalty: loyalty ? { kind: loyalty.kind, goal: loyalty.goal ?? undefined, percent: loyalty.percent ?? undefined, reward: loyalty.reward } : undefined,
    items: [...r.catalog_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        description: i.description ?? undefined,
        section: i.section ?? undefined,
        price: i.price ?? undefined,
        durationMin: i.duration_min ?? undefined,
        available: i.is_available,
        photo: i.image_url ?? undefined,
      })),
    reviews,
  };
}

export { ago };

export type CatalogSource = 'supabase' | 'ejemplo';

/** Resultado de la última carga, para mostrarlo en el perfil. */
export const catalogStatus: { source: CatalogSource; error?: string } = { source: 'ejemplo' };

/**
 * Carga negocios, catálogo y reseñas desde Supabase y reemplaza el contenido de
 * BUSINESSES (las pantallas leen de ahí). Si no hay conexión o falla, se quedan
 * los datos de ejemplo.
 */
export async function loadCatalog(timeoutMs = 7000): Promise<{ source: CatalogSource; error?: string }> {
  if (!supabase) return { source: 'ejemplo' };
  try {
    const query = supabase.from('businesses').select(SELECT).eq('status', 'activo').order('name');
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), timeoutMs));
    const { data, error } = (await Promise.race([query, timeout])) as { data: Row[] | null; error: { message: string } | null };
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return Object.assign(catalogStatus, { source: 'ejemplo' as const, error: 'La base de datos no tiene negocios activos todavía' });
    // Se conserva el mismo objeto de cada negocio (otras partes de la app ya lo tienen referenciado)
    const next = data.map(toBusiness).map((nb) => {
      const old = BUSINESSES.find((b) => b.slug === nb.slug);
      return old ? Object.assign(old, nb) : nb;
    });
    BUSINESSES.splice(0, BUSINESSES.length, ...next);
    await Promise.all([loadOpeningAds(), loadCommunity()]);
    return Object.assign(catalogStatus, { source: 'supabase' as const, error: undefined });
  } catch (e) {
    return Object.assign(catalogStatus, { source: 'ejemplo' as const, error: e instanceof Error ? e.message : String(e) });
  }
}

/** Anuncios al abrir la app vigentes (la política de la tabla solo deja ver los activos). */
async function loadOpeningAds() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('opening_ads')
    .select('id, headline, body, cta, color, image_url, businesses ( slug )')
    .eq('status', 'activa');
  if (error || !data) return;
  type AdRow = { id: string; headline: string; body: string | null; cta: string; color: string; image_url: string | null; businesses: { slug: string } | null };
  const ads = (data as unknown as AdRow[])
    .filter((a) => a.businesses?.slug)
    .map((a) => ({ id: a.id, businessSlug: a.businesses!.slug, headline: a.headline, body: a.body ?? undefined, cta: a.cta, color: a.color, photo: a.image_url ?? undefined }));
  OPENING_ADS.splice(0, OPENING_ADS.length, ...ads);
}

// ─────────────────────────────────────────────────────────────
// Comunidad: muro y preguntas
// ─────────────────────────────────────────────────────────────
type PostRow = {
  id: string; kind: Post['kind']; title: string; body: string; specialty: string | null; price: number | null; price_note: string | null;
  image_url: string | null; likes_count: number; created_at: string; businesses: { slug: string } | null;
  post_comments: { author_name: string | null; body: string; created_at: string }[];
};
type QuestionRow = {
  id: string; author_name: string | null; specialty: string | null; body: string; created_at: string; categories: { slug: string } | null;
  answers: { id: string; body: string; helpful_count: number; created_at: string; businesses: { slug: string } | null }[];
};

/** Muro y preguntas desde Supabase; reemplaza POSTS y QUESTIONS (las pantallas leen de ahí). */
export async function loadCommunity(): Promise<{ posts: Post[]; questions: Question[] } | null> {
  if (!supabase) return null;
  const [p, qq] = await Promise.all([
    supabase
      .from('posts')
      .select('id, kind, title, body, specialty, price, price_note, image_url, likes_count, created_at, businesses ( slug ), post_comments ( author_name, body, created_at )')
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('questions')
      .select('id, author_name, specialty, body, created_at, categories ( slug ), answers ( id, body, helpful_count, created_at, businesses ( slug ) )')
      .order('created_at', { ascending: false })
      .limit(150),
  ]);
  if (p.error || qq.error) return null;
  const posts = (p.data as unknown as PostRow[])
    .filter((r) => r.businesses?.slug)
    .map(
      (r): Post => ({
        id: r.id,
        businessSlug: r.businesses!.slug,
        kind: r.kind,
        title: r.title,
        body: r.body,
        specialty: r.specialty ?? undefined,
        price: r.price === null ? undefined : Number(r.price),
        priceNote: r.price_note ?? undefined,
        photo: r.image_url ?? undefined,
        dateLabel: ago(r.created_at),
        likes: r.likes_count,
        comments: [...r.post_comments].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((c) => ({ author: c.author_name ?? 'Vecino', body: c.body })),
      }),
    );
  const questions = (qq.data as unknown as QuestionRow[])
    .filter((r) => r.categories?.slug)
    .map(
      (r): Question => ({
        id: r.id,
        author: r.author_name ?? 'Vecino',
        categorySlug: r.categories!.slug,
        specialty: r.specialty ?? undefined,
        body: r.body,
        dateLabel: ago(r.created_at),
        answers: [...r.answers]
          .filter((a) => a.businesses?.slug)
          .sort((a, b) => b.helpful_count - a.helpful_count || a.created_at.localeCompare(b.created_at))
          .map((a) => ({ id: a.id, businessSlug: a.businesses!.slug, body: a.body, helpful: a.helpful_count })),
      }),
    );
  POSTS.splice(0, POSTS.length, ...posts);
  QUESTIONS.splice(0, QUESTIONS.length, ...questions);
  return { posts, questions };
}

// ─────────────────────────────────────────────────────────────
// Cuenta: lo que es de la persona que entró
// ─────────────────────────────────────────────────────────────
type RequestRow = {
  id: string; business_id: string; customer_id: string | null; customer_name: string | null; customer_phone: string | null; type: 'cita' | 'cotizacion' | 'contratacion';
  specialty: string | null; detail: string; when_text: string | null; attend: Attend; status: string; quoted_price: number | null; amount: number | null;
  payment_method: PaymentMethod | null; created_at: string; businesses: { slug: string; name: string } | null;
};

export type AccountData = {
  userId: string;
  email?: string;
  name: string;
  businessSlug: string | null;
  likedPosts: string[];
  helpfulAnswers: string[];
  /** Citas y cotizaciones que pidió como cliente */
  orders: Order[];
  /** Solicitudes que le llegan a su perfil profesional */
  requests: IncomingRequest[];
};

export async function loadAccount(): Promise<AccountData | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const [profile, slug, likes, helpful, reqs] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.rpc('my_business_slug'),
    supabase.from('post_likes').select('post_id').eq('user_id', user.id),
    supabase.from('answer_helpful').select('answer_id').eq('user_id', user.id),
    supabase
      .from('requests')
      .select('id, business_id, customer_id, customer_name, customer_phone, type, specialty, detail, when_text, attend, status, quoted_price, amount, payment_method, created_at, businesses ( slug, name )')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  const rows = (reqs.data as unknown as RequestRow[] | null) ?? [];
  const businessSlug = (slug.data as string | null) ?? null;
  const mine = rows.filter((r) => r.customer_id === user.id);
  const incoming = rows.filter((r) => r.businesses?.slug === businessSlug);
  const orderStatus = (s: string) => (s === 'rechazada' || s === 'cancelada' ? 'cancelado' : s === 'atendida' ? 'atendida' : s === 'nueva' || s === 'cotizada' ? 'esperando' : 'confirmada') as Order['status'];
  return {
    userId: user.id,
    email: user.email ?? undefined,
    name: (profile.data?.full_name as string | null) ?? '',
    businessSlug,
    likedPosts: (likes.data ?? []).map((l: { post_id: string }) => l.post_id),
    helpfulAnswers: (helpful.data ?? []).map((h: { answer_id: string }) => h.answer_id),
    orders: mine.map((r) => ({
      id: r.id,
      type: r.type === 'contratacion' ? 'pedido' : r.type,
      businessSlug: r.businesses?.slug ?? '',
      businessName: r.businesses?.name ?? '',
      detail: [r.when_text, r.detail].filter(Boolean).join(' · '),
      total: Number(r.quoted_price ?? r.amount ?? 0),
      status: r.type === 'cita' && r.status === 'nueva' ? 'confirmada' : orderStatus(r.status),
      createdAt: new Date(r.created_at).getTime(),
      paymentMethod: r.payment_method ?? undefined,
    })),
    requests: incoming.map((r) => ({
      id: r.id,
      type: r.type,
      customer: r.customer_name ?? 'Cliente',
      customerPhone: r.customer_phone ?? undefined,
      specialty: r.specialty ?? '',
      detail: r.detail,
      when: r.when_text ?? ago(r.created_at),
      attend: r.attend,
      status: (['nueva', 'aceptada', 'cotizada', 'rechazada'].includes(r.status) ? r.status : 'aceptada') as IncomingRequest['status'],
      quotedPrice: r.quoted_price === null ? undefined : Number(r.quoted_price),
      amount: r.amount === null ? undefined : Number(r.amount),
      paymentMethod: r.payment_method ?? undefined,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Escrituras (solo con sesión; si fallan, la app sigue con lo local)
// ─────────────────────────────────────────────────────────────
const isUuid = (v: string | undefined) => Boolean(v && /^[0-9a-f-]{36}$/i.test(v));

async function userId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function warn(where: string, error: { message: string } | null) {
  if (error) console.warn(`[supabase] ${where}: ${error.message}`);
  return !error;
}

export const remote = {
  async request(r: {
    business: Business; type: 'cita' | 'cotizacion' | 'contratacion'; detail: string; when?: string; specialty?: string;
    attend?: Attend; amount?: number; paymentMethod?: PaymentMethod; itemId?: string; phone?: string;
  }) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(r.business.id)) return null;
    const { data, error } = await supabase
      .from('requests')
      .insert({
        business_id: r.business.id, customer_id: uid, type: r.type, detail: r.detail, when_text: r.when ?? null, specialty: r.specialty ?? null,
        attend: r.attend ?? r.business.attends[0] ?? 'despacho', amount: r.amount ?? null, payment_method: r.paymentMethod ?? null,
        item_id: isUuid(r.itemId) ? r.itemId : null, customer_phone: r.phone ?? null,
      })
      .select('id')
      .single();
    warn('solicitud', error);
    return (data?.id as string | undefined) ?? null;
  },
  async respondRequest(id: string, status: string, quotedPrice?: number) {
    if (!supabase || !isUuid(id)) return;
    const { error } = await supabase.from('requests').update({ status, ...(quotedPrice !== undefined ? { quoted_price: quotedPrice } : {}) }).eq('id', id);
    warn('responder solicitud', error);
  },
  async review(business: Business, rating: number, body: string) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(business.id)) return;
    const { error } = await supabase.from('reviews').insert({ business_id: business.id, author_id: uid, rating, body });
    warn('reseña', error);
  },
  async sale(business: Business, s: { amount: number; method: PaymentMethod; customerPhone?: string; customerName?: string; concept?: string }) {
    if (!supabase || !isUuid(business.id)) return;
    const note = [s.customerName, s.concept].filter(Boolean).join(' · ') || null;
    const { error } = await supabase.from('sales').insert({ business_id: business.id, amount: s.amount, payment_method: s.method, customer_phone: s.customerPhone ?? null, note });
    warn('cobro', error);
  },
  /** El negocio avisa que pagó su mensualidad (con comprobante opcional en el bucket privado) */
  async reportSubPayment(slug: string, p: SubPayment) {
    if (!supabase) return;
    const b = BUSINESSES.find((x) => x.slug === slug);
    if (!b || !isUuid(b.id)) return;
    let receipt_path: string | null = null;
    if (p.receipt && !p.receipt.startsWith('http')) {
      try {
        const blob = await (await fetch(p.receipt)).blob();
        const ext = blob.type.includes('pdf') ? 'pdf' : blob.type.includes('png') ? 'png' : 'jpg';
        const path = `${slug}/mensualidades/${Date.now()}.${ext}`;
        const up = await supabase.storage.from('comprobantes').upload(path, await blob.arrayBuffer(), { contentType: blob.type || 'image/jpeg' });
        if (!up.error) receipt_path = path;
      } catch {
        // sin comprobante: el administrador lo revisa con la referencia
      }
    }
    const { error } = await supabase.from('subscription_payments').insert({
      business_id: b.id, plan: p.plan, months: p.months, amount: p.amount, method: p.method, reference: p.reference ?? null, receipt_path,
    });
    warn('mensualidad', error);
  },
  async adminRegisterSubPayment(slug: string, p: { plan: PlanId; months: number; amount: number; method: SubPayment['method'] }) {
    if (!supabase) return;
    const b = BUSINESSES.find((x) => x.slug === slug);
    if (!b || !isUuid(b.id)) return;
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert({ business_id: b.id, plan: p.plan, months: p.months, amount: p.amount, method: p.method, reference: 'Registrado por el administrador' })
      .select('id')
      .single();
    if (!warn('registrar mensualidad', error) || !data) return;
    await remote.confirmSubPayment(data.id as string);
  },
  async confirmSubPayment(paymentId: string) {
    if (!supabase || !isUuid(paymentId)) return;
    const { error } = await supabase.rpc('confirm_subscription_payment', { p_payment: paymentId });
    warn('confirmar mensualidad', error);
  },
  async rejectSubPayment(paymentId: string) {
    if (!supabase || !isUuid(paymentId)) return;
    const { error } = await supabase.from('subscription_payments').update({ status: 'rechazado' }).eq('id', paymentId);
    warn('rechazar mensualidad', error);
  },
  async replyReview(reviewId: string, reply: string) {
    if (!supabase || !isUuid(reviewId)) return;
    const { error } = await supabase.from('reviews').update({ reply, replied_at: new Date().toISOString() }).eq('id', reviewId);
    warn('responder reseña', error);
  },
  async like(postId: string, liked: boolean) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(postId)) return;
    const { error } = liked
      ? await supabase.from('post_likes').insert({ post_id: postId, user_id: uid })
      : await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid);
    warn('me sirve', error);
  },
  async comment(postId: string, body: string) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(postId)) return;
    const { error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: uid, body });
    warn('comentario', error);
  },
  async ask(categorySlug: string, body: string, specialty?: string) {
    const uid = await userId();
    if (!supabase || !uid) return false;
    const cat = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    if (!cat.data) return false;
    const { error } = await supabase.from('questions').insert({ category_id: cat.data.id, author_id: uid, body, specialty: specialty ?? null });
    return warn('pregunta', error);
  },
  async answer(questionId: string, business: Business, body: string) {
    if (!supabase || !isUuid(questionId) || !isUuid(business.id)) return false;
    const { error } = await supabase.from('answers').insert({ question_id: questionId, business_id: business.id, body });
    return warn('respuesta', error);
  },
  async helpful(answerId: string | undefined) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(answerId)) return;
    const { error } = await supabase.from('answer_helpful').insert({ answer_id: answerId, user_id: uid });
    warn('útil', error);
  },
  async post(business: Business, p: Pick<Post, 'kind' | 'title' | 'body' | 'specialty' | 'price' | 'priceNote' | 'photo'>) {
    if (!supabase || !isUuid(business.id)) return false;
    const { error } = await supabase.from('posts').insert({
      business_id: business.id, kind: p.kind, title: p.title, body: p.body, specialty: p.specialty ?? null, price: p.price ?? null,
      price_note: p.priceNote ?? null, image_url: p.photo?.startsWith('http') ? p.photo : null,
    });
    return warn('publicación', error);
  },
  async setName(name: string) {
    const uid = await userId();
    if (!supabase || !uid) return;
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', uid);
    warn('nombre', error);
  },
  async setAvailability(business: Business, v: { available?: boolean; accepts_new?: boolean }) {
    if (!supabase || !isUuid(business.id)) return;
    const { error } = await supabase.from('businesses').update(v).eq('id', business.id);
    warn('disponibilidad', error);
  },
  async claim(business: Business, license?: string) {
    const uid = await userId();
    if (!supabase || !uid || !isUuid(business.id)) return false;
    const { error } = await supabase.from('business_claims').insert({ business_id: business.id, user_id: uid, license: license ?? null });
    return warn('reclamar perfil', error);
  },
};

async function loadItems(businessId: string): Promise<CatalogItem[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('catalog_items').select('id, kind, name, description, section, price, duration_min, is_available').eq('business_id', businessId).order('position');
  return (data ?? []).map((i) => ({
    id: i.id, kind: i.kind, name: i.name, description: i.description ?? undefined, section: i.section ?? undefined,
    price: i.price === null ? undefined : Number(i.price), durationMin: i.duration_min ?? undefined, available: i.is_available,
  }));
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

/**
 * Guarda el perfil profesional. Si la persona aún no tiene perfil, lo crea (aparece de inmediato,
 * sin palomita de verificado hasta que el administrador revise su cédula). Sube a "fotos" las
 * fotos que estén solo en el teléfono. Regresa el negocio guardado o null si no se pudo.
 */
export async function saveBusiness(current: Business, patch: Partial<Business>, upload: (uri: string, folder: 'perfil' | 'galeria', slug: string) => Promise<string>): Promise<Business | null> {
  const uid = await userId();
  if (!supabase || !uid) return null;
  const next: Business = { ...current, ...patch };
  const [cat, zone] = await Promise.all([
    supabase.from('categories').select('id').eq('slug', next.categorySlug).maybeSingle(),
    supabase.from('zones').select('id').eq('name', next.zone).maybeSingle(),
  ]);
  const fields = {
    name: next.name, subtitle: next.subtitle, description: next.description, category_id: cat.data?.id ?? null, zone_id: zone.data?.id ?? null,
    phone: next.phone, whatsapp: next.phone, address: next.address, profession: next.profession, specialties: next.specialties,
    years_exp: next.yearsExp || 0, license: next.license ?? null, education: next.education ?? null, languages: next.languages, attends: next.attends,
    consult_price: next.consultPrice ?? null, response_time: next.responseTime ?? null, directions: next.references ?? null,
    urgent24: Boolean(next.urgent24), warranty: next.warranty ?? null, payment_info: next.paymentInfo ?? null,
  };

  let id = current.id;
  let slug = current.slug;
  const owned = isUuid(current.id) && (await supabase.rpc('my_business_slug')).data === current.slug;
  if (!owned) {
    slug = `${slugify(next.name) || 'experto'}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from('businesses')
      .insert({ ...fields, owner_id: uid, slug, status: 'activo', location: `SRID=4326;POINT(${ZONE.lng + (Math.random() - 0.5) * 0.01} ${ZONE.lat + (Math.random() - 0.5) * 0.01})` })
      .select('id')
      .single();
    if (!warn('crear perfil', error) || !data) return null;
    id = data.id as string;
    await supabase.from('profiles').update({ role: 'negocio' }).eq('id', uid);
    // Lo básico para recibir clientes desde el primer día: agenda, cotizaciones y una consulta inicial
    const oficio = CATEGORIES.find((c) => c.slug === next.categorySlug)?.group === 'oficios';
    await Promise.all([
      supabase.from('business_modules').insert(['reservar', 'cotizar', 'consulta'].map((module) => ({ business_id: id, module }))),
      supabase.from('business_hours').insert([1, 2, 3, 4, 5, 6].map((weekday) => ({ business_id: id, weekday, opens: '09:00', closes: weekday === 6 ? '14:00' : '18:00' }))),
      supabase.from('catalog_items').insert({
        business_id: id, kind: 'cita', section: 'Consultas', name: oficio ? 'Visita de diagnóstico' : 'Consulta inicial',
        description: next.attends.includes('en_linea') ? 'En persona o en línea' : 'Para revisar tu caso', price: next.consultPrice ?? null, duration_min: 45, position: 0,
      }),
    ]);
  }

  // Fotos: se suben ya que el perfil existe (la carpeta lleva el nombre del perfil)
  const up = async (uri: string | undefined, folder: 'perfil' | 'galeria') => (uri && !uri.startsWith('http') ? upload(uri, folder, slug) : uri);
  const photo = await up(next.photo, 'perfil');
  const cover = await up(next.cover, 'perfil');
  const gallery = await Promise.all((next.gallery ?? []).map(async (g) => ({ ...g, uri: await up(g.uri, 'galeria') })));
  const { error } = await supabase
    .from('businesses')
    .update({ ...(owned ? fields : {}), logo_url: photo?.startsWith('http') ? photo : null, cover_url: cover?.startsWith('http') ? cover : null })
    .eq('id', id);
  warn('guardar perfil', error);
  await supabase.from('business_photos').delete().eq('business_id', id);
  if (gallery.length) {
    const { error: gErr } = await supabase
      .from('business_photos')
      .insert(gallery.map((g, i) => ({ business_id: id, caption: g.caption, color: g.color ?? null, url: g.uri?.startsWith('http') ? g.uri : null, position: i })));
    warn('galería', gErr);
  }
  return { ...next, id, slug, photo, cover, gallery, verified: owned ? current.verified : false, rating: owned ? current.rating : 0, ratingCount: owned ? current.ratingCount : 0, reviews: owned ? current.reviews : [], items: owned ? current.items : await loadItems(id), closesAt: owned ? current.closesAt : '18:00', modules: owned ? current.modules : ['reservar', 'cotizar', 'consulta'] };
}

/**
 * Mensualidades: el administrador ve las de todos; el dueño, solo las suyas (lo filtra RLS).
 * Los comprobantes son privados: se regresa una liga temporal de 1 hora.
 */
export async function loadBilling(): Promise<Record<string, Billing> | null> {
  if (!supabase) return null;
  const [biz, pays] = await Promise.all([
    supabase.from('businesses').select('id, slug, plan, paid_plan, paid_until'),
    supabase
      .from('subscription_payments')
      .select('id, business_id, plan, months, amount, method, reference, receipt_path, status, period_end, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  if (biz.error || !biz.data) return null;
  type PayRow = { id: string; business_id: string; plan: PlanId; months: number; amount: number; method: SubPayment['method']; reference: string | null; receipt_path: string | null; status: SubPayment['status']; period_end: string | null; created_at: string };
  const rows = (pays.data as PayRow[] | null) ?? [];
  const signed: Record<string, string> = {};
  const paths = rows.map((r) => r.receipt_path).filter((x): x is string => Boolean(x));
  if (paths.length) {
    const { data } = await supabase.storage.from('comprobantes').createSignedUrls(paths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
  }
  const out: Record<string, Billing> = {};
  for (const b of biz.data as { id: string; slug: string; plan: PlanId; paid_plan: PlanId | null; paid_until: string | null }[]) {
    out[b.slug] = {
      plan: b.paid_plan ?? b.plan,
      paidUntil: b.paid_until ?? undefined,
      payments: rows
        .filter((r) => r.business_id === b.id)
        .map((r) => ({
          id: r.id, plan: r.plan, months: r.months, amount: Number(r.amount), method: r.method, reference: r.reference ?? undefined,
          receipt: r.receipt_path ? signed[r.receipt_path] : undefined, status: r.status, createdAt: new Date(r.created_at).getTime(), periodEnd: r.period_end ?? undefined,
        })),
    };
  }
  return out;
}
