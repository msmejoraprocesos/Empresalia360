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

### ¿Ya tenías la base? Revisa qué le falta

Pega `supabase/verificar.sql` en el SQL Editor y dale **Run**. No cambia nada: te dice archivo por archivo si está ✅ completo o ❌ qué le falta.

- Si algún archivo sale ❌, corre **ese archivo y todos los que le siguen, en orden** (están en `supabase/migrations`). Se pueden volver a correr sin perder datos.
- No corras uno viejo después de uno nuevo: algunos actualizan las mismas reglas y el viejo las regresaría a la versión anterior. Si te pasa, vuelve a correr los nuevos.
- No vuelvas a correr `setup.sql` completo en una base que ya existe: el primer archivo marca error porque las tablas ya están.

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

Desde ese momento, en tu cuenta aparece **Perfil → Panel de administración** (a nadie más le aparece, y la base rechaza a quien no sea administrador). Ahí, en **Negocios**:

- **Dar de alta un experto:** lo registras tú (queda publicado, sin dueño, con 30 días de prueba) y le mandas su liga por WhatsApp con un botón.
- **Reclamos de perfil:** el experto abre su liga, toca **“¿Eres tú? Reclama este perfil”** y entra con su correo. Tú ves quién es (nombre, correo, cédula) y tocas **Aprobar**: el perfil pasa a su cuenta con todo y reseñas.
- **Cédulas por verificar:** con liga al Registro Nacional de Profesionistas de la SEP; **Verificar** le pone la palomita.
- **Suspender / Reactivar** cualquier perfil.

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
     - Pasados los 7 días, su perfil se oculta del directorio. Sus datos y reseñas se guardan; al pagar vuelve a aparecer.


## 7. Cobro automático con tarjeta (Mercado Pago)

Con esto el negocio mete su tarjeta una vez y **se le cobra solo cada mes**; su fecha se recorre sin que confirmes nada. La transferencia sigue funcionando igual.

1. **Tu cuenta de Mercado Pago:** entra a [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers) → **Tus integraciones** → **Crear aplicación** (tipo: *Suscripciones*). En **Credenciales de producción** copia el **Access Token** (empieza con `APP_USR-`).
   - Para probar primero, usa las **credenciales de prueba** y cuentas de prueba de Mercado Pago.
2. **Subir las 3 funciones** (Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**). Por cada una, ponle el nombre exacto, borra el ejemplo y pega el archivo completo:
   - `mp-suscripcion` ← `supabase/functions-pegar/mp-suscripcion.ts`
   - `mp-webhook` ← `supabase/functions-pegar/mp-webhook.ts`
   - `avisos-mensualidades` ← `supabase/functions-pegar/avisos-mensualidades.ts`
   - En cada función, en **Details**, **apaga “Verify JWT”** (ellas mismas revisan quién llama).
   - Si usas la terminal: `npx supabase functions deploy` desde la carpeta del proyecto hace lo mismo.
3. **Secretos** (Edge Functions → **Secrets** → Add new secret):

   | Nombre | Valor |
   | --- | --- |
   | `MP_ACCESS_TOKEN` | El Access Token del paso 1 |
   | `MP_WEBHOOK_SECRET` | La clave secreta del paso 4 |
   | `APP_URL` | `https://msmejoraprocesos.github.io/Empresalia360/` (o tu dominio) |

4. **Avisos de Mercado Pago:** en tu aplicación de Mercado Pago → **Webhooks** → **Configurar notificaciones**:
   - URL: `https://TU-PROYECTO.supabase.co/functions/v1/mp-webhook`
   - Eventos: **Planes y suscripciones** (los dos: suscripciones y pagos autorizados).
   - Guarda, copia la **clave secreta** que te muestra y ponla en `MP_WEBHOOK_SECRET`.
5. **Prender el botón en la app:** en `apps/mobile/src/constants/contacto.ts` pon `MERCADO_PAGO_ACTIVO = true` (o dime y lo hago yo al publicar).

Cómo se ve: en **Mi plan** el negocio elige su plan → **Con tarjeta, cada mes automático** → lo mandamos a Mercado Pago a poner su tarjeta → regresa a la app. En **Admin → Mensualidades** ves la etiqueta 💳 *Tarjeta automática* y cada cobro aparece como pagado solo. El negocio puede cancelar cuando quiera desde Mi plan.

> Mercado Pago cobra una comisión por cada cobro; revisa la tarifa vigente en tu cuenta.

## 8. Avisos por correo de las mensualidades

La función `avisos-mensualidades` (subida en el paso 7) manda, una sola vez por fecha:

- al negocio: aviso **5 días antes** (no a quien paga con tarjeta automática), **el día que vence** y **cuando su perfil se oculta**;
- a ti: un **resumen diario** con pagos por confirmar y negocios por atender.

1. **Brevo** (gratis hasta 300 correos al día): en [brevo.com](https://www.brevo.com) crea cuenta, verifica tu correo remitente y en **SMTP & API → API Keys** crea una llave.
2. **Secretos** en Supabase (Edge Functions → Secrets):

   | Nombre | Valor |
   | --- | --- |
   | `BREVO_API_KEY` | La llave de Brevo |
   | `AVISOS_REMITENTE` | El correo que verificaste en Brevo |
   | `ADMIN_EMAIL` | Tu correo, para el resumen diario |
   | `CRON_SECRET` | Una contraseña larga que inventes |

3. **Programarla:** Supabase → **Integrations → Cron → Create job**:
   - Nombre: `expertalia-avisos` · Horario: `0 13 * * *` (7:00 a. m. del centro de México)
   - Tipo: **Supabase Edge Function** → `avisos-mensualidades`, método **POST**
   - Encabezado (header): `x-cron-secret` = el mismo valor de `CRON_SECRET`
4. **Probar sin mandar correos:** en Edge Functions → `avisos-mensualidades` → **Test**, agrega el encabezado `x-cron-secret` y pon `?prueba` al final de la ruta: te regresa a quién le tocaría aviso, sin enviar nada.

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

- **Mensualidades y Mercado Pago** (con un Mercado Pago de prueba):
  1. El negocio paga con tarjeta: se crea su suscripción con el precio de su mundo (oficio Premium: $199).
  2. El aviso de Mercado Pago con firma falsa se rechaza; con firma buena, el cobro se registra **una sola vez** aunque llegue repetido, y la fecha se recorre un mes.
  3. El dueño no puede marcarse como pagado ni cambiar su fecha.
  4. Cancelar el cobro automático.
  5. Correos: “tu plan vence” al negocio, resumen al administrador, y al día siguiente no se repite.
- **Administración:**
  1. Solo la cuenta con `role = 'admin'` abre el panel; a los demás les sale un candado.
  2. El admin da de alta un experto sin dueño; otro usuario lo reclama; el admin aprueba y el perfil pasa a su cuenta.
  3. Verificar y suspender; Estándar con tope de 5 servicios y sin muro.

## Pendiente para producción

- **Cobro de citas y servicios del cliente** con tarjeta: hoy el cliente paga al experto en efectivo o transferencia (las mensualidades sí se cobran con tarjeta, paso 7).
- **Avisos al celular:** notificaciones push o WhatsApp cuando llega una cita.
- **Guardar en la base:** promociones, lealtad y red de expertos todavía viven en el teléfono.
