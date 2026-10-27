/** Contacto de soporte que aparece en "Ayuda". Cámbialo aquí por el correo o WhatsApp oficial. */
export const SOPORTE_CORREO = 'msmejoraprocesos@gmail.com';
/** WhatsApp de soporte con lada (ej. '5214420000000'); vacío = no se muestra el botón */
export const SOPORTE_WHATSAPP = '';

/**
 * Datos para que los negocios te paguen su mensualidad (banco, CLABE y a nombre de quién).
 * Mientras esté vacío, la app les dice que te pidan los datos por correo.
 */
export const COBRO_EXPERTALIA = '';

/**
 * Cobro automático con tarjeta (Mercado Pago). Ponlo en true cuando ya subiste las funciones
 * mp-suscripcion y mp-webhook y guardaste tu MP_ACCESS_TOKEN (ver docs/CONECTAR-SUPABASE.md, paso 7).
 * Sin base conectada (demostración) el botón siempre se muestra y el pago se simula.
 */
export const MERCADO_PAGO_ACTIVO = false;
