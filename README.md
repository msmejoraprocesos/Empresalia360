# Expertalia 360

Directorio de **profesionistas** (con carrera y cédula: abogados, contadores, notarías, psicología, arquitectura, consultoría) y **oficios** (técnicos y maestros: plomería, electricidad, carpintería, climas, pintura y albañilería, cerrajería). Son dos mundos separados, cada uno con su color y su fondo.

- **El experto** crea su perfil con especialidades, cédula, experiencia, fotos, galería, ubicación y referencias.
- **El cliente** lo encuentra describiendo su problema (escrito o por voz), ve reseñas y agenda, pide cotización o contrata un paquete.
- **En la comunidad**, los expertos anuncian servicios, consejos y eventos, y responden preguntas.

Está pensada para que se entienda sin leer: dibujos a color, botones grandes, lectura en voz alta y búsqueda por voz.

**App web:** https://msmejoraprocesos.github.io/Empresalia360/ Se instala en el teléfono como app: en Android con el aviso "Instalar"; en iPhone con Compartir → Agregar a inicio. Abre sin internet.

## Estructura

| Carpeta | Qué contiene |
| --- | --- |
| `apps/mobile` | App para web, iOS y Android en Expo SDK 58 (React Native, Expo Router) |
| `apps/mobile/src/constants/supabase.ts` | **Las dos llaves de Supabase** (único lugar a llenar) |
| `supabase/migrations` | Esquema: Postgres + PostGIS, RLS en todas las tablas |
| `supabase/seed.sql` · `seed_demo.sql` | Zonas, categorías y especialidades · expertos, muro y preguntas de ejemplo |
| `supabase/functions` | Funciones del servidor: cobro con tarjeta (Mercado Pago), su aviso de pago y correos de mensualidades · `functions-pegar/` las trae en un solo archivo para pegarlas en Supabase |
| `supabase/setup.sql` | Todo junto para pegar una vez en el SQL Editor (`bash supabase/build-setup.sh` lo regenera) |
| `web/` | Íconos, manifiesto, service worker y el script que publica la app web |
| `docs/CONECTAR-SUPABASE.md` | **Guía paso a paso para conectar Supabase** |

## Datos y conexión

Sin llaves de Supabase, la app usa los datos de ejemplo de `src/data/mock.ts` y todo se guarda solo en el teléfono. Con llaves, ocurre lo siguiente:

- Expertos, reseñas, muro y preguntas se leen de la base (`src/data/remote.ts`).
- Agendar, cotizar, contratar, opinar, preguntar, responder y publicar piden **entrar con el correo**. El acceso es con un código de 6 números, sin contraseña (`src/app/entrar.tsx`), y lo hecho se guarda en la base.
- "Soy profesional u oficio" crea el perfil real de la persona y sube sus fotos al bucket `fotos`.

Pasos en [`docs/CONECTAR-SUPABASE.md`](docs/CONECTAR-SUPABASE.md).

Para regenerar los datos de ejemplo desde `mock.ts`:

```bash
cd apps/mobile && npx tsx scripts/generate-demo-seed.ts && bash ../../supabase/build-setup.sh
```

## Desarrollo

```bash
cd apps/mobile
npm install
npx expo start --web
npx tsc --noEmit && npx expo lint
```

## Publicar la app web

```bash
bash web/rebuild.sh     # compila y deja index.html, 404.html, sw.js, manifest e íconos en la raíz
git add -A && git commit -m "..." && git push    # GitHub Pages publica desde main
```

`web/build_single.py` empaqueta la app en un solo HTML: imágenes incrustadas y navegación en memoria, para que funcione en cualquier ruta y dentro de vistas previas. Además, rebaja el código para navegadores de teléfonos viejos.

## Créditos

- Dibujos: [Twemoji](https://github.com/jdecked/twemoji) (CC BY 4.0).
- Caras: *Personas* de [DiceBear](https://www.dicebear.com) por Draftbot (CC BY 4.0).
- Mapa: Leaflet con mosaicos de CARTO y OpenStreetMap.
