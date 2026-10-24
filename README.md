# Expertalia 360

Directorio de profesionales y oficios (abogados, contadores, notarías, psicólogos, arquitectos, plomeros, electricistas y más). Cada experto crea su perfil con especialidades, cédula y experiencia; los clientes lo encuentran describiendo su problema, ven reseñas y agendan o piden cotización. Incluye una comunidad donde los expertos anuncian servicios, consejos y eventos. Por ahora funciona con datos de ejemplo (`apps/mobile/src/data/mock.ts`); solo se conecta a Supabase si se definen `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Antes del primer build en EAS: `cd apps/mobile && npx eas-cli@latest init`.

App móvil para micro y pequeños negocios y profesionales locales: catálogo, pedidos, reservas, cotizaciones, cobros en efectivo, tarjeta o transferencia, lealtad por número de celular, promociones, reseñas verificadas y mapa. Incluye una red entre negocios (proveedores y repartidores), espacios preferenciales de pago y un panel de administración.

## Estructura

| Carpeta | Qué contiene |
| --- | --- |
| `apps/mobile` | App para iOS, Android y web en Expo SDK 58 (React Native, Expo Router) |
| `supabase/migrations` | Esquema de base de datos: Postgres + PostGIS, RLS en todas las tablas |
| `supabase/seed.sql` | Zonas y categorías iniciales |
| `supabase/seed_demo.sql` | 12 negocios ficticios para probar |
| `supabase/setup.sql` | Todo lo anterior en un solo archivo para pegar en el SQL Editor |
| `docs/github-actions/android-apk.yml` | Versión nueva de la tarea de GitHub que compila el APK en Expo (EAS); va en `.github/workflows/` |

## Pantallas

| Modo | Ruta | Pantallas |
| --- | --- | --- |
| Arranque | `/bienvenida`, `/elegir-perfil` | Bienvenida en 3 pasos y elección de modo (vecino, negocio, repartidor) |
| Vecino | `/cliente/*` | Inicio personalizado, Buscar (categorías en mosaicos), Mi QR, Pedidos (en curso / completados), Perfil |
| Vecino | `/categoria/[slug]`, `/mapa` | Listado con filtros y mapa con pines por categoría |
| Vecino | `/negocio/[slug]` (+ `menu`, `reservar`, `cotizar`, `resenas`) | Perfil del negocio o profesional, menú con carrito, reserva con horarios, cotización, reseñas Expertalia 360 / Google |
| Vecino | `/pago`, `/pedido-confirmado`, `/calificar/[id]` | Pago con "Estoy aquí", propina y forma de pago; confirmación; reseña verificada |
| Vecino | `/lealtad`, `/comunidad`, `/presupuesto/[id]` | Tarjetas con anillo y cupones; nivel, Ruta del mes y eventos; presupuesto del taller |
| Negocio | `/panel/*` | Inicio con interruptores, pedidos entrantes con ubicación del cliente, cobrar con teclado y lealtad, reseñas con respuesta, menú Más |
| Negocio | `/mi-negocio/*` | Productos, alta de producto, agenda, clientes y lealtad, corte de caja, promociones, espacios preferenciales (incluye anuncio al abrir la app), estadísticas, pedir a la red, solicitudes como proveedor |
| Repartidor | `/repartidor` | Disponibilidad, envíos urgentes, recoger y entregar |
| Público | `/n/[slug]` | Mini sitio del negocio con liga y QR |
| Operador | `/admin/*` | Resumen, negocios (con estadísticas de cada uno), moderación, publicidad (ocupación, tarifario, nueva campaña con precio), promociones globales, notificaciones, algoritmo del inicio, planes y cobros |

## Desarrollo

```bash
cd apps/mobile
npm install
npx expo start          # escanea el QR con Expo Go
npx expo start --web    # o ábrela en el navegador
```

Si Supabase no responde, la app funciona con datos de ejemplo (`src/data/mock.ts`). Pedidos, citas y cobros todavía viven en memoria (`src/store/app.tsx`).

### Conectar Supabase

1. **Crear las tablas y los datos de prueba:** en Supabase → SQL Editor → New query, pega todo `supabase/setup.sql` y dale **Run** (una sola vez, en un proyecto nuevo). Crea el esquema, las zonas, las categorías y 12 negocios ficticios.
2. **La app ya apunta al proyecto de Expertalia 360** (`apps/mobile/src/constants/supabase.ts`, valores públicos). Para usar otro proyecto, define `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `apps/mobile/.env.local` o como Variables de GitHub Actions.

Hoy la app **lee** de Supabase los negocios, productos, horarios, lealtad y reseñas. Inicio de sesión y guardado de pedidos, citas, cobros y reseñas siguen en memoria (próximo paso). En Perfil, al pie, aparece si está "conectado a Supabase".

**Si ya corriste `setup.sql` antes:** no lo vuelvas a correr completo. Pega y corre solo las migraciones nuevas, en orden: `supabase/migrations/20261023020000_estadisticas.sql` y `supabase/migrations/20261023030000_anuncio_al_abrir.sql` (y, si quieres los anuncios de ejemplo, el bloque final de `seed_demo.sql` que empieza en "Anuncios al abrir la app").

Para regenerar los negocios de prueba desde `src/data/mock.ts`: `cd apps/mobile && npx tsx scripts/generate-demo-seed.ts`.

## Estadísticas de cada negocio

La app registra de forma anónima lo que pasa en la página de cada negocio (tabla `business_events`): quién la abre, si ve el menú o los servicios, qué producto elige, si lee las reseñas, si escribe por WhatsApp o pide cómo llegar, si compra, y cuánto tiempo se queda. Cada teléfono tiene un identificador aleatorio; no se guarda nombre, teléfono ni ubicación.

El dueño lo ve en **Más → Estadísticas** (y en la tarjeta "Hoy te vieron N personas" del inicio): personas que vieron el negocio, cuántas se detuvieron más de 10 segundos, tiempo promedio, embudo de ver a comprar, productos más elegidos, de dónde llegan, horas fuertes, resultado del anuncio y sugerencias. El administrador lo ve desde **Negocios**.

La función `business_stats(slug, días)` arma los indicadores; solo responde al dueño, al administrador o al SQL Editor (`select business_stats('cafe-la-esquina', 7);`). Mientras no haya inicio de sesión, la app muestra un historial de ejemplo más las visitas hechas desde ese teléfono.

## Fotos

Al dar de alta un producto o servicio, al crear una promoción y al armar el anuncio al abrir la app, el negocio puede **tomar una foto o elegirla de la galería** (`expo-image-picker`). Se muestran en el menú, la página del negocio, las promociones del inicio y el anuncio. Se guardan en Supabase Storage, bucket público `fotos`, en carpetas por negocio (`<slug>/productos|promociones|anuncios/`); solo el dueño (o el admin) puede subir. Mientras no haya inicio de sesión, la foto se usa desde el teléfono. Migración: `supabase/migrations/20261023040000_fotos.sql`.

## Anuncio al abrir la app

Producto de publicidad de $100 al mes (tarifa en `src/data/ads.ts`): el logo y la promoción del negocio aparecen a pantalla completa, como historia, durante 6 segundos al abrir la app. Cada marca le aparece a cada persona como máximo una vez cada 3 horas; las marcas se turnan y nunca sale más de un anuncio por apertura. El negocio lo arma y lo compra en **Espacios preferenciales** con vista previa; queda en revisión hasta que el administrador lo aprueba en **Publicidad**. Las vistas y los toques se cuentan en sus estadísticas. Tabla `opening_ads`.

## Instalar en el teléfono

**Android:** el APK se compila en Expo (EAS Build). Desde GitHub: Actions → **Build Android (EAS)** → Run workflow (perfil `preview`). Al terminar, en expo.dev → Expertalia 360 → Builds aparece el botón **Install** con un QR para instalarlo en el teléfono. También se puede lanzar directo en expo.dev → Builds → Build from GitHub (Base directory `apps/mobile`, perfil `preview`). Requiere el secret `EXPO_TOKEN` en GitHub. La llave de firma de los APK de prueba está en `apps/mobile/credentials/`.

**iPhone:** Apple no permite instalar apps desde un archivo. Para probar: instala **Expo Go** y en tu computadora corre `npx expo start` dentro de `apps/mobile`, luego escanea el QR. Para distribuirla se necesita una cuenta de Apple Developer y TestFlight (EAS Build).

**Mapa en Android:** sin llave de Google Maps se muestra un plano esquemático. Para el mapa real, crea el secret `GOOGLE_MAPS_API_KEY` en GitHub.

## Versión web (GitHub Pages)

Igual que los sitios de Viva, la app se publica como página en **https://msmejoraprocesos.github.io/expertalia-360-app/** (repositorio público `msmejoraprocesos/expertalia-360-app`, que solo contiene la app compilada, no el código). Se abre en cualquier teléfono, Android o iPhone, sin instalar nada.

Para actualizarla: `cd apps/mobile && bash scripts/publish-web.sh <carpeta del repo expertalia-360-app>`, luego commit y push en ese repositorio.

## Builds para tiendas (EAS)

Conecta el proyecto de Expo a este repositorio desde expo.dev con **Base directory** = `apps/mobile`. Perfiles en `apps/mobile/eas.json`: `preview` (APK interno) y `production`.

## Paleta

Naranja chile `#E04A1F` · Amarillo mango `#FFC93C` · Verde nopal `#12A06E` · Azul alberca `#2D7FF9` · Rosa bugambilia `#E8457C` · Morado jacaranda `#7B4FE0` · Fondo crema `#FFF8F0` · Texto `#1F1A17`
