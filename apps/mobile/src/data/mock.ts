/**
 * Datos de ejemplo de Expertalia 360. Los profesionistas son ficticios
 * y sirven para probar la app mientras no esté conectada a su propio Supabase.
 */
import { Brand } from '../constants/brand';
import type { EmojiName } from '../constants/emoji';

import type { Business, Category, IncomingRequest, Order, Post, Promotion, Question, Review } from './types';

export const ZONE = { name: 'Querétaro Centro', municipality: 'Querétaro', lat: 20.6015, lng: -100.329 };

const sp = (name: string, ...keywords: string[]) => ({ name, keywords });

export const CATEGORIES: Category[] = [
  // ── Profesionales ──────────────────────────────────────────
  {
    slug: 'abogados', name: 'Abogados', professional: 'Abogado', group: 'profesionales', color: Brand.chile, ink: Brand.white, icon: 'briefcase-outline', emoji: 'balanza',
    specialties: [
      sp('Familiar', 'divorcio', 'pensión', 'pension', 'custodia', 'patria potestad', 'adopción'),
      sp('Laboral', 'despido', 'finiquito', 'liquidación', 'demanda laboral', 'trabajo', 'imss'),
      sp('Mercantil y corporativo', 'empresa', 'sociedad', 'contrato', 'socios', 'cobranza', 'pagaré'),
      sp('Penal', 'denuncia', 'delito', 'detenido', 'fraude', 'amparo'),
      sp('Civil e inmobiliario', 'arrendamiento', 'renta', 'inquilino', 'compraventa', 'herencia', 'testamento', 'juicio'),
      sp('Migratorio', 'visa', 'residencia', 'migración', 'pasaporte', 'naturalización'),
      sp('Fiscal', 'sat', 'multa', 'crédito fiscal', 'embargo'),
    ],
  },
  {
    slug: 'contadores', name: 'Contadores', professional: 'Contador', group: 'profesionales', color: Brand.nopal, ink: Brand.white, icon: 'calculator-outline', emoji: 'abaco',
    specialties: [
      sp('Declaración anual', 'declaración', 'declaracion', 'saldo a favor', 'devolución', 'impuestos'),
      sp('RESICO y personas físicas', 'resico', 'freelance', 'honorarios', 'arrendamiento'),
      sp('Contabilidad de empresas', 'contabilidad', 'pyme', 'empresa', 'balance'),
      sp('Nómina e IMSS', 'nómina', 'nomina', 'imss', 'infonavit', 'empleados'),
      sp('Defensa ante el SAT', 'requerimiento', 'sat', 'multa', 'auditoría', 'buzón tributario'),
      sp('Facturación', 'factura', 'cfdi', 'timbrado'),
    ],
  },
  {
    slug: 'notarias-y-tramites', name: 'Notarías y trámites', professional: 'Notario o gestor', group: 'profesionales', color: Brand.mango, ink: Brand.ink, icon: 'document-text-outline', emoji: 'pergamino',
    specialties: [
      sp('Escrituras', 'escritura', 'compraventa', 'casa', 'terreno'),
      sp('Testamentos', 'testamento', 'herencia'),
      sp('Poderes notariales', 'poder', 'carta poder'),
      sp('Traducción certificada', 'traducción', 'traduccion', 'perito traductor', 'apostilla'),
      sp('Gestoría', 'placas', 'licencia', 'cita sat', 'e.firma', 'trámite'),
    ],
  },
  {
    slug: 'psicologia-y-salud', name: 'Psicología y salud', professional: 'Especialista', group: 'profesionales', color: Brand.bugambilia, ink: Brand.white, icon: 'heart-outline', emoji: 'cerebro',
    specialties: [
      sp('Terapia individual', 'terapia', 'psicólogo', 'psicologo', 'depresión'),
      sp('Terapia de pareja', 'pareja', 'matrimonio'),
      sp('Ansiedad y estrés', 'ansiedad', 'estrés', 'estres', 'pánico'),
      sp('Nutrición', 'nutriólogo', 'dieta', 'nutricion'),
      sp('Fisioterapia', 'fisioterapia', 'lesión', 'rehabilitación', 'espalda'),
    ],
  },
  {
    slug: 'arquitectura', name: 'Arquitectura e ingeniería', professional: 'Arquitecto o ingeniero', group: 'profesionales', color: Brand.ink, ink: Brand.mango, icon: 'business-outline', emoji: 'construccion',
    specialties: [
      sp('Proyecto arquitectónico', 'planos', 'diseño', 'casa nueva'),
      sp('Licencias de construcción', 'licencia', 'permiso', 'construcción'),
      sp('Remodelación', 'remodelar', 'ampliación', 'cocina', 'baño'),
      sp('Avalúos', 'avalúo', 'avaluo', 'valor de mi casa'),
      sp('Cálculo estructural', 'estructura', 'grietas', 'cimentación'),
    ],
  },
  {
    slug: 'consultoria', name: 'Consultoría y seguros', professional: 'Consultor', group: 'profesionales', color: Brand.jacaranda, ink: Brand.white, icon: 'trending-up-outline', emoji: 'grafica',
    specialties: [
      sp('Mejora de procesos', 'procesos', 'eficiencia', 'costos', 'indicadores'),
      sp('Finanzas para PyME', 'finanzas', 'flujo', 'crédito', 'precios'),
      sp('Marketing digital', 'redes sociales', 'publicidad', 'página web', 'marketing'),
      sp('Seguros de gastos médicos', 'seguro médico', 'gastos médicos', 'hospital'),
      sp('Seguros de vida y retiro', 'seguro de vida', 'retiro', 'ahorro', 'afore'),
    ],
  },
  // ── Oficios ────────────────────────────────────────────────
];

/** Dibujo de cada especialidad (lo ve quien no lee) */
const SPECIALTY_EMOJI: Record<string, EmojiName> = {
  Familiar: 'familia', Laboral: 'portafolio', 'Mercantil y corporativo': 'edificio', Penal: 'candado', 'Civil e inmobiliario': 'casa',
  Migratorio: 'mundo', Fiscal: 'gobierno', 'Declaración anual': 'recibo', 'RESICO y personas físicas': 'laptop',
  'Contabilidad de empresas': 'grafica', 'Nómina e IMSS': 'personas', 'Defensa ante el SAT': 'escudo', Facturación: 'recibo',
  Escrituras: 'casa', Testamentos: 'pergamino', 'Poderes notariales': 'nota', 'Traducción certificada': 'globo_texto', Gestoría: 'portapapeles',
  'Terapia individual': 'cerebro', 'Terapia de pareja': 'anillo', 'Ansiedad y estrés': 'pensando', Nutrición: 'regadera', Fisioterapia: 'hospital',
  'Proyecto arquitectónico': 'escuadra', 'Licencias de construcción': 'portapapeles', Remodelación: 'ladrillos', Avalúos: 'dinero', 'Cálculo estructural': 'construccion',
  'Mejora de procesos': 'grafica', 'Finanzas para PyME': 'dinero', 'Marketing digital': 'megafono', 'Seguros de gastos médicos': 'hospital', 'Seguros de vida y retiro': 'escudo',
  'Fugas de agua': 'gota', Calentadores: 'regadera', 'Destapes y drenaje': 'destapador', 'Tinacos y cisternas': 'gota', 'Instalación hidráulica': 'llave_inglesa',
  'Cortos y fallas': 'enchufe', 'Instalaciones eléctricas': 'foco', 'Paneles solares': 'foco', 'Cámaras y seguridad': 'camara',
  'Muebles a medida': 'serrucho', 'Closets y cocinas': 'puerta', 'Puertas y ventanas': 'puerta', 'Reparación de muebles': 'herramientas',
  Minisplits: 'copo', Refrigeradores: 'copo', 'Lavadoras y secadoras': 'herramientas',
  Pintura: 'brocha', Impermeabilización: 'paraguas', Albañilería: 'ladrillos',
  Aperturas: 'puerta', 'Cambio de chapas': 'candado', 'Llaves de auto': 'llave',
};
for (const c of CATEGORIES) for (const s of c.specialties) s.emoji = SPECIALTY_EMOJI[s.name] ?? c.emoji;

/** Dibujo de una especialidad por su nombre (o el de su categoría) */
export function specialtyEmoji(name: string): EmojiName {
  for (const c of CATEGORIES) {
    const s = c.specialties.find((x) => x.name === name);
    if (s) return s.emoji ?? c.emoji;
  }
  return 'estrella';
}

const r = (id: string, author: string, rating: number, body: string, dateLabel: string, extra: Partial<Review> = {}): Review => ({
  id,
  author,
  rating,
  body,
  dateLabel,
  verified: true,
  ...extra,
});

export const BUSINESSES: Business[] = [
  {
    id: 'b1',
    slug: 'lic-mariana-ortiz',
    name: 'Lic. Mariana Ortiz',
    categorySlug: 'abogados',
    profession: 'Abogada',
    specialties: ['Familiar', 'Civil e inmobiliario'],
    yearsExp: 12,
    license: 'Cédula 7845120',
    education: 'Licenciatura en Derecho, UAQ · Maestría en Derecho Familiar',
    languages: ['Español', 'Inglés'],
    attends: ['despacho', 'en_linea'],
    consultPrice: 500,
    responseTime: 'Responde en menos de 2 h',
    subtitle: 'Abogada · familiar y civil',
    description: 'Te acompaño en divorcios, pensiones alimenticias, custodia, testamentos y juicios de arrendamiento. Explico cada paso con claridad y te doy cotización por escrito antes de empezar.',
    address: 'Plaza Zen, local 8',
    zone: 'Querétaro Centro',
    lat: 20.6012,
    lng: -100.3254,
    rating: 5.0,
    ratingCount: 41,
    isOpen: true,
    closesAt: '18:00',
    phone: '5214420000101',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    promo: 'Primera consulta en línea a $350',
    staff: ['Lic. Ortiz'],
    items: [
      { id: 'i10', kind: 'cita', section: 'Consultas', name: 'Consulta inicial', description: 'En despacho o videollamada', price: 500, durationMin: 45, available: true },
      { id: 'i11', kind: 'cotizacion', section: 'Familiar', name: 'Divorcio voluntario', description: 'Honorarios según el caso', available: true },
      { id: 'i12', kind: 'cotizacion', section: 'Familiar', name: 'Pensión alimenticia', description: 'Solicitud o modificación', available: true },
      { id: 'i13', kind: 'cotizacion', section: 'Civil', name: 'Testamento', description: 'Incluye acompañamiento a notaría', available: true },
      { id: 'i14', kind: 'cotizacion', section: 'Civil', name: 'Juicio de arrendamiento', description: 'Desalojo o cobro de rentas', available: true },
    ],
    reviews: [
      r('rv10', 'Claudia R.', 5, 'Me explicó todo con claridad y la cotización llegó el mismo día. Mi divorcio quedó en tres meses.', 'hace 1 mes', { paidWith: 'transferencia', reply: 'Gracias, Claudia. Fue un gusto acompañarte.' }),
      r('rv11', 'Pedro S.', 5, 'Muy humana en un momento difícil. Siempre contestó mis dudas.', 'hace 2 meses', { paidWith: 'tarjeta' }),
      r('rv12', 'Usuario verificado', 4, 'Buena abogada, los tiempos del juzgado se alargaron pero ella me mantuvo informado.', 'hace 3 meses', { paidWith: 'efectivo' }),
    ],
  },
  {
    id: 'b2',
    slug: 'ortiz-salinas-abogados',
    name: 'Ortiz Salinas Abogados',
    categorySlug: 'abogados',
    profession: 'Despacho de abogados',
    specialties: ['Mercantil y corporativo', 'Fiscal', 'Laboral'],
    yearsExp: 18,
    license: '6 abogados con cédula verificada',
    education: 'Socios egresados de la Escuela Libre de Derecho y el ITAM',
    languages: ['Español', 'Inglés'],
    attends: ['despacho', 'en_linea'],
    consultPrice: 1200,
    responseTime: 'Responde el mismo día',
    subtitle: 'Despacho · empresas y fiscal',
    description: 'Constitución de sociedades, contratos, defensa fiscal y laboral para empresas. Igualas mensuales para PyMEs.',
    address: 'Blvd. Bernardo Quintana 450, piso 7',
    zone: 'Centro Sur',
    lat: 20.6041,
    lng: -100.3265,
    rating: 4.8,
    ratingCount: 67,
    isOpen: true,
    closesAt: '19:00',
    phone: '5214420000102',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['Cualquiera', 'Lic. Salinas', 'Lic. Ortega'],
    items: [
      { id: 'i20', kind: 'cita', section: 'Consultas', name: 'Consulta empresarial', description: '45 min con un socio', price: 1200, durationMin: 45, available: true },
      { id: 'i21', kind: 'cotizacion', section: 'Corporativo', name: 'Constitución de sociedad', description: 'S.A. de C.V. o S.A.S.', available: true },
      { id: 'i22', kind: 'cotizacion', section: 'Corporativo', name: 'Revisión de contrato', available: true },
      { id: 'i23', kind: 'cotizacion', section: 'Fiscal', name: 'Defensa de crédito fiscal', available: true },
    ],
    reviews: [r('rv20', 'Luis T.', 5, 'Constituimos la empresa en tiempo récord y sin sorpresas en el costo.', 'hace 1 semana', { paidWith: 'transferencia' })],
  },
  {
    id: 'b3',
    slug: 'lic-roberto-campos',
    name: 'Lic. Roberto Campos',
    categorySlug: 'abogados',
    profession: 'Abogado',
    specialties: ['Laboral'],
    yearsExp: 9,
    license: 'Cédula 9120334',
    education: 'Licenciatura en Derecho, UNAM',
    languages: ['Español'],
    attends: ['despacho', 'en_linea'],
    consultPrice: 0,
    responseTime: 'Responde en menos de 1 h',
    subtitle: 'Abogado · laboral',
    description: 'Despidos injustificados, finiquitos, demandas y conciliación laboral. Reviso tu caso sin costo y solo cobro si recuperas.',
    address: 'Calle Madero 33, despacho 2',
    zone: 'Centro Histórico',
    lat: 20.6008,
    lng: -100.3318,
    rating: 4.7,
    ratingCount: 58,
    isOpen: true,
    closesAt: '18:30',
    phone: '5214420000103',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['Lic. Campos'],
    items: [
      { id: 'i30', kind: 'cita', name: 'Revisión de caso', description: 'Trae tu contrato y recibos', price: 0, durationMin: 30, available: true },
      { id: 'i31', kind: 'cotizacion', name: 'Demanda por despido', description: 'Honorarios sobre lo recuperado', available: true },
    ],
    reviews: [r('rv30', 'Jorge V.', 5, 'Recuperé mi finiquito completo. Siempre me tuvo al tanto.', 'hace 3 semanas', { paidWith: 'efectivo' })],
  },
  {
    id: 'b4',
    slug: 'lic-daniela-trevino',
    name: 'Lic. Daniela Treviño',
    categorySlug: 'abogados',
    profession: 'Abogada',
    specialties: ['Migratorio', 'Penal'],
    yearsExp: 7,
    license: 'Cédula 10233871',
    education: 'Licenciatura en Derecho, Tec de Monterrey',
    languages: ['Español', 'Inglés', 'Francés'],
    attends: ['en_linea', 'despacho'],
    consultPrice: 600,
    responseTime: 'Responde en menos de 3 h',
    subtitle: 'Abogada · migratorio y penal',
    description: 'Residencias, regularización migratoria, naturalización y defensa penal. Atiendo en tres idiomas.',
    address: 'Atención en línea',
    zone: 'Juriquilla',
    lat: 20.5985,
    lng: -100.3335,
    rating: 4.9,
    ratingCount: 33,
    isOpen: true,
    closesAt: '20:00',
    phone: '5214420000104',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['Lic. Treviño'],
    items: [
      { id: 'i40', kind: 'cita', name: 'Consulta migratoria', description: 'Videollamada', price: 600, durationMin: 40, available: true },
      { id: 'i41', kind: 'cotizacion', name: 'Residencia temporal o permanente', available: true },
      { id: 'i42', kind: 'cotizacion', name: 'Defensa penal', available: true },
    ],
    reviews: [r('rv40', 'Michael B.', 5, 'Got my permanent residency without a single trip back to the office. Excelente.', 'hace 2 semanas', { paidWith: 'tarjeta' })],
  },
  {
    id: 'b5',
    slug: 'despacho-contable-reyes',
    name: 'Despacho Contable Reyes',
    categorySlug: 'contadores',
    profession: 'Contadores públicos',
    specialties: ['Declaración anual', 'Contabilidad de empresas', 'Defensa ante el SAT', 'Nómina e IMSS'],
    yearsExp: 15,
    license: 'C.P.C. Héctor Reyes · Cédula 4410982',
    education: 'Contaduría Pública, UAQ · Certificación IMCP',
    languages: ['Español'],
    attends: ['despacho', 'en_linea'],
    consultPrice: 0,
    responseTime: 'Responde el mismo día',
    subtitle: 'Contadores · personas y empresas',
    description: 'Contabilidad mensual, declaraciones, nómina y defensa ante el SAT para personas físicas, RESICO y PyMEs.',
    address: 'Av. Zaragoza 120, piso 3',
    zone: 'Querétaro Centro',
    lat: 20.6022,
    lng: -100.3301,
    rating: 4.9,
    ratingCount: 132,
    isOpen: true,
    closesAt: '19:00',
    phone: '5214420000105',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['Cualquiera', 'C.P. Héctor Reyes', 'C.P. Sofía Reyes'],
    items: [
      { id: 'i50', kind: 'cita', name: 'Asesoría fiscal', description: 'En despacho o videollamada', price: 0, durationMin: 30, available: true },
      { id: 'i51', kind: 'cotizacion', name: 'Declaración anual persona física', description: 'Desde $1,200', available: true },
      { id: 'i52', kind: 'cotizacion', name: 'Contabilidad mensual PyME', description: 'Desde $3,500 al mes', available: true },
      { id: 'i53', kind: 'cotizacion', name: 'Respuesta a requerimiento del SAT', available: true },
    ],
    reviews: [
      r('rv50', 'Rodrigo M.', 5, 'Me sacaron de un requerimiento del SAT en una semana. Muy claros con los costos.', 'hace 2 días', { paidWith: 'transferencia' }),
      r('rv51', 'Lucía P.', 5, 'Mi declaración anual quedó en un día y con saldo a favor.', 'hace 1 semana', { paidWith: 'tarjeta' }),
    ],
  },
  {
    id: 'b6',
    slug: 'cp-laura-mendez',
    name: 'C.P. Laura Méndez',
    categorySlug: 'contadores',
    profession: 'Contadora',
    specialties: ['RESICO y personas físicas', 'Declaración anual', 'Facturación'],
    yearsExp: 6,
    license: 'Cédula 11092376',
    education: 'Contaduría, UVM',
    languages: ['Español'],
    attends: ['en_linea'],
    consultPrice: 350,
    responseTime: 'Responde en menos de 1 h',
    subtitle: 'Contadora · freelancers y RESICO',
    description: 'Declaraciones para freelancers, creadores de contenido y pequeños negocios. Todo en línea, sin papeles.',
    address: 'Atención en línea',
    zone: 'Juriquilla',
    lat: 20.5979,
    lng: -100.3302,
    rating: 4.8,
    ratingCount: 94,
    isOpen: true,
    closesAt: '20:00',
    phone: '5214420000106',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['C.P. Méndez'],
    items: [
      { id: 'i60', kind: 'cita', name: 'Videollamada de dudas', price: 350, durationMin: 30, available: true },
      { id: 'i61', kind: 'cotizacion', name: 'Plan freelancer mensual', description: 'Desde $590 al mes', available: true },
    ],
    reviews: [r('rv60', 'Claudia R.', 5, 'Por fin entiendo mis impuestos. Responde rapidísimo.', 'hace 1 semana', { paidWith: 'tarjeta' })],
  },
  {
    id: 'b7',
    slug: 'notaria-publica-14',
    name: 'Notaría Pública 14',
    categorySlug: 'notarias-y-tramites',
    profession: 'Notaría',
    specialties: ['Escrituras', 'Testamentos', 'Poderes notariales'],
    yearsExp: 25,
    license: 'Lic. Andrade · Notario titular',
    languages: ['Español'],
    attends: ['despacho'],
    consultPrice: 0,
    responseTime: 'Cotiza en 24 h',
    subtitle: 'Notaría · escrituras y testamentos',
    description: 'Escrituras, testamentos, poderes y actas constitutivas. Cotización por escrito en 24 horas.',
    address: 'Av. Universidad 280',
    zone: 'Centro Sur',
    lat: 20.6031,
    lng: -100.3342,
    rating: 4.6,
    ratingCount: 112,
    isOpen: true,
    closesAt: '17:00',
    phone: '5214420000107',
    modules: ['reservar', 'cotizar'],
    delivers: false,
    verified: true,
    staff: ['Cualquiera', 'Lic. Andrade'],
    items: [
      { id: 'i70', kind: 'cita', name: 'Asesoría notarial', price: 0, durationMin: 30, available: true },
      { id: 'i71', kind: 'cotizacion', name: 'Escritura de compraventa', description: 'Según valor del inmueble', available: true },
      { id: 'i72', kind: 'cotizacion', name: 'Testamento', available: true },
    ],
    reviews: [r('rv70', 'Marta L.', 5, 'Todo listo en la fecha prometida. Excelente trato.', 'hace 2 semanas', { paidWith: 'transferencia' })],
  },
  {
    id: 'b8',
    slug: 'traducciones-peritas-morales',
    name: 'Traducciones Peritas Morales',
    categorySlug: 'notarias-y-tramites',
    profession: 'Perito traductor',
    specialties: ['Traducción certificada'],
    yearsExp: 11,
    license: 'Perito autorizado por el Tribunal Superior de Justicia',
    languages: ['Español', 'Inglés', 'Francés'],
    attends: ['despacho', 'en_linea'],
    responseTime: 'Entrega en 48 h',
    subtitle: 'Perito traductor · inglés y francés',
    description: 'Traducciones certificadas de actas, títulos, contratos y expedientes para juicios o trámites migratorios.',
    address: 'Calle Hidalgo 77',
    zone: 'Centro Histórico',
    lat: 20.6058,
    lng: -100.3312,
    rating: 4.9,
    ratingCount: 49,
    isOpen: true,
    closesAt: '19:00',
    phone: '5214420000108',
    modules: ['cotizar'],
    delivers: false,
    verified: true,
    items: [
      { id: 'i80', kind: 'cotizacion', name: 'Acta de nacimiento', description: 'Desde $450 · 48 h', available: true },
      { id: 'i81', kind: 'cotizacion', name: 'Contrato o expediente', description: 'Precio por cuartilla', available: true },
    ],
    reviews: [r('rv80', 'Lic. Mariana Ortiz', 5, 'Mi perito de confianza para juicios. Siempre a tiempo.', 'hace 5 días', { paidWith: 'transferencia' })],
  },
  {
    id: 'b9',
    slug: 'psic-andrea-vidal',
    name: 'Psic. Andrea Vidal',
    categorySlug: 'psicologia-y-salud',
    profession: 'Psicóloga',
    specialties: ['Terapia individual', 'Terapia de pareja', 'Ansiedad y estrés'],
    yearsExp: 10,
    license: 'Cédula 8031457',
    education: 'Maestría en Psicoterapia Cognitivo Conductual',
    languages: ['Español', 'Inglés'],
    attends: ['despacho', 'en_linea'],
    consultPrice: 700,
    responseTime: 'Responde en menos de 4 h',
    subtitle: 'Psicóloga · adultos y parejas',
    description: 'Terapia individual y de pareja, presencial o en línea. Enfoque cognitivo conductual.',
    address: 'Calle Jazmín 41, consultorio 2',
    zone: 'Juriquilla',
    lat: 20.5995,
    lng: -100.3355,
    rating: 4.9,
    ratingCount: 87,
    isOpen: true,
    closesAt: '20:00',
    phone: '5214420000109',
    modules: ['reservar', 'consulta'],
    delivers: false,
    verified: true,
    staff: ['Psic. Vidal'],
    items: [
      { id: 'i90', kind: 'cita', name: 'Sesión individual', description: 'Presencial o en línea', price: 700, durationMin: 50, available: true },
      { id: 'i91', kind: 'cita', name: 'Sesión de pareja', price: 950, durationMin: 60, available: true },
    ],
    reviews: [r('rv90', 'Usuario verificado', 5, 'Me sentí escuchado desde la primera sesión.', 'hace 1 semana', { paidWith: 'transferencia' })],
  },
  {
    id: 'b10',
    slug: 'arq-diego-fuentes',
    name: 'Arq. Diego Fuentes',
    categorySlug: 'arquitectura',
    profession: 'Arquitecto',
    specialties: ['Proyecto arquitectónico', 'Licencias de construcción', 'Remodelación'],
    yearsExp: 14,
    license: 'Cédula 5520981 · DRO registrado',
    education: 'Arquitectura, UAQ',
    languages: ['Español'],
    attends: ['domicilio', 'despacho'],
    consultPrice: 800,
    responseTime: 'Responde en menos de 1 día',
    subtitle: 'Arquitecto · proyectos y licencias',
    description: 'Planos, remodelaciones, licencias de construcción y dirección de obra. La visita de levantamiento se descuenta del proyecto.',
    address: 'Av. Industrial 102',
    zone: 'El Marqués',
    lat: 20.6015,
    lng: -100.3235,
    rating: 4.7,
    ratingCount: 29,
    isOpen: false,
    closesAt: '18:00',
    phone: '5214420000110',
    modules: ['reservar', 'cotizar'],
    delivers: true,
    verified: true,
    staff: ['Arq. Fuentes'],
    items: [
      { id: 'i100', kind: 'cita', name: 'Visita de levantamiento', price: 800, durationMin: 90, available: true },
      { id: 'i101', kind: 'cotizacion', name: 'Proyecto de remodelación', description: 'Planos y presupuesto de obra', available: true },
      { id: 'i102', kind: 'cotizacion', name: 'Licencia de construcción', available: true },
    ],
    reviews: [r('rv100', 'Jorge V.', 5, 'La licencia salió a la primera, gracias a sus planos.', 'hace 3 semanas', { paidWith: 'transferencia' })],
  },
  {
    id: 'b11',
    slug: 'patricia-luna-seguros',
    name: 'Patricia Luna',
    categorySlug: 'consultoria',
    profession: 'Asesora de seguros',
    specialties: ['Seguros de gastos médicos', 'Seguros de vida y retiro'],
    yearsExp: 8,
    license: 'Cédula CNSF A-120394',
    languages: ['Español'],
    attends: ['despacho', 'en_linea', 'domicilio'],
    consultPrice: 0,
    responseTime: 'Responde en menos de 1 h',
    subtitle: 'Asesora de seguros · vida y gastos médicos',
    description: 'Comparo varias aseguradoras y te explico cada cobertura sin presiones. Revisión de pólizas sin costo.',
    address: 'Plaza Zen, local 15',
    zone: 'Querétaro Centro',
    lat: 20.6005,
    lng: -100.3281,
    rating: 4.8,
    ratingCount: 53,
    isOpen: true,
    closesAt: '19:00',
    phone: '5214420000111',
    modules: ['reservar', 'cotizar', 'consulta'],
    delivers: true,
    verified: true,
    staff: ['Patricia Luna'],
    items: [
      { id: 'i110', kind: 'cita', name: 'Revisión de pólizas', price: 0, durationMin: 40, available: true },
      { id: 'i111', kind: 'cotizacion', name: 'Gastos médicos mayores', description: 'Individual o familiar', available: true },
    ],
    reviews: [r('rv110', 'Laura M.', 5, 'Me explicó cada cobertura sin presiones.', 'hace 2 semanas', { paidWith: 'tarjeta' })],
  },
  {
    id: 'b12',
    slug: 'rumbo-consultores',
    name: 'Rumbo Consultores',
    categorySlug: 'consultoria',
    profession: 'Consultoría para PyMEs',
    specialties: ['Mejora de procesos', 'Finanzas para PyME'],
    yearsExp: 12,
    education: 'Ingeniería Industrial · Lean Six Sigma Black Belt',
    languages: ['Español', 'Inglés'],
    attends: ['domicilio', 'en_linea'],
    consultPrice: 0,
    responseTime: 'Responde el mismo día',
    subtitle: 'Consultoría · procesos y finanzas',
    description: 'Diagnóstico operativo, mejora de procesos, costos y tableros de indicadores para micro y pequeñas empresas.',
    address: 'Av. Constituyentes 812',
    zone: 'Centro Sur',
    lat: 20.5992,
    lng: -100.3245,
    rating: 4.9,
    ratingCount: 38,
    isOpen: true,
    closesAt: '19:00',
    phone: '5214420000112',
    modules: ['reservar', 'cotizar'],
    delivers: true,
    verified: true,
    staff: ['Cualquiera'],
    items: [
      { id: 'i120', kind: 'cita', name: 'Diagnóstico express', description: '1 hora en tu negocio', price: 0, durationMin: 60, available: true },
      { id: 'i121', kind: 'cotizacion', name: 'Proyecto de mejora de procesos', description: '4 a 8 semanas', available: true },
    ],
    reviews: [r('rv120', 'Ana G.', 5, 'Bajamos 15% los costos del taller en dos meses.', 'hace 1 mes', { paidWith: 'transferencia' })],
  },
  // ── Oficios ────────────────────────────────────────────────
];

/** Anuncios de servicios, consejos y eventos que publican los profesionales en la comunidad. */
export const POSTS: Post[] = [
  {
    id: 'po1', businessSlug: 'despacho-contable-reyes', kind: 'servicio', specialty: 'Declaración anual',
    title: 'Declaración anual de personas físicas', body: 'Revisamos tus deducciones (médicos, colegiaturas, intereses) para que recuperes tu saldo a favor. Trae tu e.firma o te ayudamos a tramitarla.',
    price: 1200, priceNote: 'precio fijo', dateLabel: 'hace 2 h', likes: 34, comments: [{ author: 'Lucía P.', body: '¿Incluye si tengo dos patrones?' }, { author: 'Despacho Contable Reyes', body: 'Sí, Lucía, mismo precio.' }],
  },
  {
    id: 'po3', businessSlug: 'lic-mariana-ortiz', kind: 'servicio', specialty: 'Familiar',
    title: 'Divorcio voluntario con convenio', body: 'Si ambos están de acuerdo, el trámite puede quedar en 6 a 10 semanas. Primera consulta en línea a $350 para revisar tu caso.',
    price: 350, priceNote: 'primera consulta', dateLabel: 'ayer', likes: 21, comments: [],
  },
  {
    id: 'po4', businessSlug: 'rumbo-consultores', kind: 'evento', specialty: 'Finanzas para PyME',
    title: 'Taller gratuito: precios que sí dejan utilidad', body: 'Sábado 8 de noviembre, 10:00 h, en línea. Para dueños de negocio que quieren calcular bien sus costos. Cupo de 30 lugares.',
    dateLabel: 'ayer', likes: 47, comments: [{ author: 'Ana G.', body: 'Ya me registré 🙌' }],
  },
  {
    id: 'po6', businessSlug: 'lic-roberto-campos', kind: 'consejo', specialty: 'Laboral',
    title: 'Te despidieron: no firmes nada todavía', body: 'Tienes 2 meses para reclamar. Antes de firmar tu finiquito, revisa que incluya aguinaldo, vacaciones y prima vacacional proporcionales.',
    dateLabel: 'hace 3 días', likes: 112, comments: [{ author: 'Jorge V.', body: 'Este consejo me salvó.' }],
  },
  {
    id: 'po8', businessSlug: 'psic-andrea-vidal', kind: 'consejo', specialty: 'Ansiedad y estrés',
    title: 'Respiración 4-7-8 para bajar la ansiedad', body: 'Inhala en 4 segundos, sostén 7 y exhala en 8. Repite cuatro veces. Si la ansiedad no cede en semanas, vale la pena pedir ayuda.',
    dateLabel: 'hace 5 días', likes: 76, comments: [],
  },
];

export const PROMOTIONS: Promotion[] = [
  { id: 'p1', kind: 'negocio', badge: '$350', title: 'Primera consulta en línea', subtitle: 'Lic. Mariana Ortiz · derecho familiar', businessSlug: 'lic-mariana-ortiz' },
  { id: 'p2', kind: 'global', badge: '−15%', title: 'Temporada de declaraciones', subtitle: 'Con contadores de Expertalia 360' },
  { id: 'p3', kind: 'vence', badge: 'Gratis', title: 'Revisión de pólizas', subtitle: 'Patricia Luna · vence el domingo', businessSlug: 'patricia-luna-seguros' },
  { id: 'p5', kind: 'cumpleanos', badge: '−20%', title: 'Tu regalo de cumpleaños', subtitle: 'Psic. Andrea Vidal', businessSlug: 'psic-andrea-vidal' },
];

/** Preguntas que los clientes hacen a la comunidad y responden los expertos. */
export const QUESTIONS: Question[] = [
  {
    id: 'qa1', author: 'Laura M.', categorySlug: 'abogados', specialty: 'Laboral', dateLabel: 'hace 3 h',
    body: 'Me ofrecen firmar mi renuncia a cambio de un mes de sueldo. ¿Me conviene o me corresponde más?',
    answers: [
      { businessSlug: 'lic-roberto-campos', body: 'Si te están pidiendo renunciar, en realidad es un despido. Te corresponden 3 meses de salario, 20 días por año en algunos casos, más aguinaldo, vacaciones y prima proporcionales. No firmes sin revisar los números.', helpful: 24 },
    ],
  },
  {
    id: 'qa2', author: 'Pedro S.', categorySlug: 'contadores', specialty: 'Declaración anual', dateLabel: 'ayer',
    body: '¿Tengo que presentar declaración anual si solo tuve un trabajo de sueldo?',
    answers: [
      { businessSlug: 'despacho-contable-reyes', body: 'Si ganaste menos de 400 mil pesos y solo de un patrón, no es obligatoria. Pero si tuviste gastos médicos o colegiaturas, conviene presentarla para recuperar saldo a favor.', helpful: 31 },
      { businessSlug: 'cp-laura-mendez', body: 'Coincido. Revisa también si tu patrón te hizo el ajuste anual; si no, podrías tener saldo a favor.', helpful: 9 },
    ],
  },
  {
    id: 'qa4', author: 'Usuario 3381', categorySlug: 'arquitectura', dateLabel: 'hace 4 días',
    body: '¿Necesito licencia para construir un segundo piso en mi casa?', answers: [],
  },
];

const H = 3600 * 1000;

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    type: 'cita',
    businessSlug: 'lic-mariana-ortiz',
    businessName: 'Lic. Mariana Ortiz',
    detail: 'Mañana 10:00 · consulta inicial',
    total: 500,
    status: 'confirmada',
    createdAt: Date.now() - 5 * H,
  },
  {
    id: 'o3',
    type: 'cotizacion',
    businessSlug: 'despacho-contable-reyes',
    businessName: 'Despacho Contable Reyes',
    detail: 'Declaración anual · dos patrones',
    total: 0,
    status: 'esperando',
    createdAt: Date.now() - 6 * H,
  },
];

/** Perfil del usuario en modo profesional (ejemplo: una abogada). */
export const MY_BUSINESS_SLUG = 'lic-mariana-ortiz';

export const INCOMING_REQUESTS: IncomingRequest[] = [
  { id: 'rq1', type: 'cita', customer: 'Ana G.', specialty: 'Familiar', detail: 'Consulta inicial · quiere saber cómo pedir pensión alimenticia', when: 'Mañana 10:00', attend: 'en_linea', status: 'nueva' },
  { id: 'rq2', type: 'cotizacion', customer: 'Carlos M.', specialty: 'Civil e inmobiliario', detail: 'Su inquilino debe 4 meses de renta; pide cotización del juicio', when: 'Recibida hace 25 min', attend: 'despacho', status: 'nueva' },
  { id: 'rq3', type: 'cotizacion', customer: 'Lucía P.', specialty: 'Familiar', detail: 'Divorcio voluntario, sin hijos, con un departamento en común', when: 'Recibida ayer', attend: 'despacho', status: 'cotizada', quotedPrice: 14000 },
  { id: 'rq4', type: 'cita', customer: 'Pedro S.', specialty: 'Civil e inmobiliario', detail: 'Testamento · revisión de documentos', when: 'Jue 11:30', attend: 'despacho', status: 'aceptada' },
];

// ─────────────────────────────────────────────────────────────
// Detalles de perfil: referencias para llegar, galería, urgencias,
// garantía, paquetes con precio fijo y tarjetas de lealtad
// ─────────────────────────────────────────────────────────────
const EXTRA: Record<string, Partial<Business>> = {
  'lic-mariana-ortiz': {
    references: 'Plaza Zen, planta alta, local 8. Frente al Oxxo; hay estacionamiento de la plaza.',
    paymentInfo: 'BBVA · CLABE 012 680 0123 4567 8901 · a nombre de Mariana Ortiz Lara',
    gallery: [
      { id: 'g1', caption: 'Sala de juntas del despacho', color: '#DCE4F2' },
      { id: 'g2', caption: 'Recepción', color: '#E9E2FA' },
    ],
    loyalty: { kind: 'sellos', goal: 5, reward: 'Quinta consulta sin costo' },
  },
  'despacho-contable-reyes': {
    references: 'Edificio gris de 4 pisos, piso 3. Entrada por Zaragoza, a media cuadra del jardín.',
    gallery: [
      { id: 'g1', caption: 'Despacho', color: '#DDF1EA' },
      { id: 'g2', caption: 'Área de atención', color: '#E1E8F4' },
    ],
    loyalty: { kind: 'sellos', goal: 12, reward: 'Un mes de contabilidad gratis' },
  },
  'psic-andrea-vidal': {
    references: 'Consultorio 2, planta baja. Timbre con el nombre "Vidal".',
    gallery: [{ id: 'g1', caption: 'Consultorio', color: '#F8E1EB' }],
  },
  'notaria-publica-14': { references: 'Casona amarilla frente a la Facultad de Derecho. Estacionamiento en la parte trasera.' },
  'arq-diego-fuentes': {
    gallery: [
      { id: 'g1', caption: 'Remodelación de cocina, Juriquilla', color: '#E2E7EF' },
      { id: 'g2', caption: 'Casa habitación, El Marqués', color: '#DCE4F2' },
    ],
  },
};

/** Paquetes con precio fijo que el cliente puede contratar y pagar en la app. */
const PACKAGES: Record<string, Business['items']> = {
  'despacho-contable-reyes': [
    { id: 'pk1', kind: 'producto', section: 'Paquetes', name: 'Declaración anual persona física', description: 'Sueldos, honorarios o arrendamiento', price: 1200, available: true },
    { id: 'pk2', kind: 'producto', section: 'Paquetes', name: 'Declaración mensual RESICO', description: 'Incluye revisión de facturas', price: 650, available: true },
    { id: 'pk3', kind: 'producto', section: 'Trámites', name: 'Alta en el SAT y e.firma', description: 'Te acompañamos a la cita', price: 900, available: true },
  ],
  'cp-laura-mendez': [
    { id: 'pk4', kind: 'producto', section: 'Paquetes', name: 'Plan freelancer mensual', description: 'Declaración y facturación ilimitada', price: 590, available: true },
    { id: 'pk5', kind: 'producto', section: 'Paquetes', name: 'Declaración anual', description: 'Persona física', price: 950, available: true },
  ],
  'traducciones-peritas-morales': [
    { id: 'pk6', kind: 'producto', section: 'Certificadas', name: 'Acta de nacimiento', description: 'Inglés o francés · 48 h', price: 450, available: true },
    { id: 'pk7', kind: 'producto', section: 'Certificadas', name: 'Título profesional', price: 650, available: true },
  ],
  'lic-mariana-ortiz': [
    { id: 'pk8', kind: 'producto', section: 'Paquetes', name: 'Revisión de contrato de arrendamiento', description: 'Entrega por escrito en 48 h', price: 900, available: true },
  ],
};

/**
 * Expertos que trabajan en varias categorías: aparecen en cada una (y en los dos mundos si aplica).
 * Siempre dentro de su mismo mundo: un despacho contable que también da consultoría,
 * o un despacho de abogados que también lleva contabilidad.
 */
const MULTI: Record<string, { categories: string[]; specialties: string[] }> = {
  'despacho-contable-reyes': { categories: ['consultoria'], specialties: ['Finanzas para PyME'] },
  'ortiz-salinas-abogados': { categories: ['contadores'], specialties: ['Contabilidad de empresas'] },
};

for (const b of BUSINESSES) {
  Object.assign(b, EXTRA[b.slug] ?? {});
  const extra = PACKAGES[b.slug];
  if (extra) b.items.push(...extra);
  const multi = MULTI[b.slug];
  if (multi) {
    b.categorySlugs = multi.categories;
    b.specialties = [...b.specialties, ...multi.specialties.filter((x) => !b.specialties.includes(x))];
  }
}

// Ejemplo de perfil que dio de alta el administrador y aún no reclama su dueño
for (const b of BUSINESSES) if (b.slug === 'traducciones-peritas-morales') b.claimable = true;

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
