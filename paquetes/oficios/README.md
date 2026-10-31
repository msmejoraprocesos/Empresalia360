# Paquete de Oficios (guardado, sin usar)

Expertalia 360 quedó **solo para profesionistas** (con carrera y cédula). Todo lo de **oficios**
(plomeros, electricistas, carpinteros, climas, pintura y albañilería, cerrajeros) está guardado aquí
para hacer después la app de Oficios. **La app no carga nada de esta carpeta.**

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `datos-oficios.ts` | Las 6 categorías de oficios con sus especialidades, los 6 expertos de ejemplo, sus publicaciones del muro, promoción, pregunta, cita de ejemplo, referencias, paquetes y categorías extra. Es lo que se quitó de `apps/mobile/src/data/mock.ts`. |
| `world-guide.tsx.txt` | La guía "¿A qué mundo perteneces?" (¿tienes cédula profesional?) que se usaba al crear el perfil. |

Además, en la rama **`respaldo-oficios`** del repositorio está la app completa tal como estaba
con los dos mundos juntos (27 de octubre de 2026).

## Precios de Oficios (ya en la base de datos)

| Plan | Oficios | Profesionistas |
| --- | --- | --- |
| Estándar | $99 | $199 |
| Premium | $199 | $399 |
| VIP | $399 | $799 |

La tabla `plans` ya tiene las dos columnas (`monthly_price_oficios` y `monthly_price`) y la base
cobra según el mundo de la categoría (`categories.world`). No hay que cambiar nada para oficios.

## Cómo se hará la app de Oficios (sin duplicar código)

La app **no se copia**. Es el **mismo código** con otro ajuste:

1. `apps/mobile/src/constants/app-config.ts` → `MUNDO = 'oficios'`.
2. Los datos de `datos-oficios.ts` vuelven a `mock.ts` (o se cargan de la base, que ya los separa por `world`).
3. Marca propia: nombre, logo y colores (`constants/brand.ts`, `assets/brand`).
4. Se compila como otra app/otra liga.

Así, cada mejora (historias, publicidad, cobros, directorio web) llega a las dos apps a la vez,
y el soporte se hace una sola vez. Ver `docs/UNA-BASE-DOS-APPS.md`.
