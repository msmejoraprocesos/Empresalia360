# Conectar Expertalia 360 a Supabase

Todo está listo: base de datos, permisos, inicio de sesión con código por correo y guardado real. Solo falta crear el proyecto y pegar dos valores. Tiempo aproximado: 20 minutos.

## 1. Crear el proyecto

1. Entra a **supabase.com** → **New project**.
2. Nombre: `expertalia-360`. Región: la más cercana a México (por ejemplo *East US*).
3. Guarda la **contraseña de la base de datos** en un lugar seguro. No se la pases a nadie y no va en la app.

## 2. Crear las tablas (un solo paso)

1. En el proyecto: **SQL Editor** → **New query**.
2. Abre `supabase/setup.sql` de este repositorio, copia **todo** y pégalo.
3. Dale **Run**. Debe decir *Success*.

Esto crea:

- **El esquema completo:**
  - Expertos, especialidades, galería y referencias para llegar.
  - Citas, cotizaciones y contrataciones.
  - Reseñas.
  - Muro, preguntas y respuestas.
  - Promociones, lealtad, anuncios y estadísticas.
- **Los permisos de seguridad (RLS) de cada tabla.**
- **La carpeta de fotos.**
- **Los datos de ejemplo:**
  - 6 zonas y 12 categorías (6 de profesionistas y 6 de oficios), con 55 especialidades.
  - 18 expertos de ejemplo, el muro y las preguntas.

Córrelo **una sola vez**, en un proyecto nuevo.

## 3. Correo de acceso (código de 6 números)

La app no usa contraseñas: la persona escribe su correo, le llega un código y lo escribe en la app.

1. **Authentication → Sign In / Providers → Email:** que esté activado.
2. **Authentication → Email Templates:** en **Magic Link** y también en **Confirm signup**, cambia el cuerpo por:

   ```html
   <h2>Tu código de Expertalia 360</h2>
   <p>Escribe este código en la app:</p>
   <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Vence en una hora. Si no lo pediste, ignora este correo.</p>
   ```

   Asunto sugerido: `Tu código de Expertalia 360`.
3. **Authentication → URL Configuration → Site URL:** `https://msmejoraprocesos.github.io/Empresalia360/`

> **Importante: el correo gratuito de Supabase solo llega a los miembros de tu equipo** de Supabase, y como máximo 2 correos por hora.
>
> - **Para probar tú:** con eso basta.
> - **Para que entren clientes y expertos reales:** conecta un servicio de correo en **Project Settings → Authentication → SMTP Settings**. Brevo es gratis hasta 300 correos al día y no pide dominio propio; solo verificas tu correo de remitente. Otra opción es Resend, que sí pide un dominio.

## 4. Pasar las llaves

En **Project Settings → API** (o el botón **Connect**) copia:

- **Project URL**, por ejemplo `https://abcdxyz.supabase.co`.
- **anon / publishable key**, la llave pública.

Mándamelas en el chat y yo vuelvo a compilar y publicar. O pégalas tú en `apps/mobile/src/constants/supabase.ts`:

```ts
export const SUPABASE_URL = 'https://abcdxyz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

**Nunca** pases la llave `service_role` (secreta) ni la contraseña de la base de datos.

## 5. Hacerte administrador

1. Entra una vez a la app con tu correo.
2. En el SQL Editor corre:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'msmejoraprocesos@gmail.com');
```

Como administrador puedes:

- Verificar cédulas:
  ```sql
  update businesses set verified = true where slug = '...';
  ```
- Aprobar reclamos de perfil:
  ```sql
  update business_claims set status = 'aprobada' where id = '...';
  ```

## 6. Mensualidades automáticas

1. **Antes de correr `setup.sql`:** en **Database → Extensions** busca `pg_cron` y actívalo. Esto programa la revisión diaria a las 6:00.
   - Si ya corriste `setup.sql` sin activarla, actívala y corre esto en el SQL Editor:
     ```sql
     select cron.schedule('expertalia-mensualidades', '0 12 * * *', 'select public.refresh_billing()');
     ```
2. **Tus datos de cobro:** pon tu banco, CLABE y titular en `apps/mobile/src/constants/contacto.ts` (`COBRO_EXPERTALIA`). Es lo que ven los negocios al pagar. También puedes mandármelos y yo los pongo.
3. **Cómo funciona:**
   - El negocio paga y avisa desde **Más → Mi plan**, con su comprobante.
   - Tú lo confirmas en **Admin → Mensualidades** y su fecha se recorre sola.
   - Todos los días la base revisa a todos los negocios:
     - A 5 días de vencer, el negocio ve un aviso para pagar.
     - Ya vencido, tiene 7 días de gracia.
     - Pasados los 7 días, baja a Básico (sigue visible, pero sin los beneficios de su plan).

## Qué cambia en la app al conectarla

| | Sin Supabase (hoy) | Con Supabase |
| --- | --- | --- |
| Expertos, reseñas, muro y preguntas | Datos de ejemplo | De la base de datos |
| Agendar, cotizar, contratar, opinar, preguntar, "me sirve" | Solo en ese teléfono | Pide entrar con correo y se guarda |
| "Soy profesional u oficio" | Edita un perfil de ejemplo | Crea **su** perfil, aparece de inmediato en búsquedas y mapa (sin palomita de verificado hasta que revises su cédula) |
| Solicitudes del profesional | Ejemplo | Las citas y cotizaciones reales de sus clientes; las confirma o cotiza |
| Fotos de perfil, portada y galería | En el teléfono | Se suben a la carpeta `fotos` |

## Lo que ya se probó

Antes de entregarlo, la app se probó completa contra un Postgres con el mismo `setup.sql`, con el mismo tipo de API y de inicio de sesión que usa Supabase.

- **Profesional:**
  1. Entra con su correo.
  2. Crea su perfil, que aparece en la búsqueda del cliente.
  3. Recibe la cita y la confirma.
  4. Responde una pregunta.
  5. Publica en el muro.
- **Cliente:**
  1. Encuentra a la profesional.
  2. Al agendar, la app le pide entrar.
  3. Agenda, y la cita aparece en *Mis citas*.
- **Seguridad:**
  - Nadie puede marcarse verificado, cambiar su calificación ni editar o publicar a nombre de otro experto.
  - La calificación se recalcula sola con cada reseña.

## Pendiente para producción

- **Cobro real:** Mercado Pago o Stripe. Hoy "Pagar" registra la contratación, pero no cobra.
- **Avisos:** notificaciones push o WhatsApp cuando llega una cita.
- **Pantallas de administrador conectadas a la base:** verificar cédulas y aprobar reclamos. Hoy se hace con las dos líneas de SQL de arriba.
- **Guardar en la base:** promociones, lealtad y red de expertos todavía viven en el teléfono.
