# Expertalia 360 · app móvil

App en Expo SDK 58 con Expo Router. Ver el README de la raíz para la lista de pantallas.

```bash
npm install
npx expo start
```

- `src/app` — rutas (cada archivo es una pantalla)
- `src/components` — componentes visuales compartidos
- `src/data` — tipos y datos de ejemplo
- `src/store` — estado de la app (carrito, pedidos, lealtad, negocio, red, administración)
- `src/lib/supabase.ts` — cliente de Supabase (se activa con `.env.local`)
