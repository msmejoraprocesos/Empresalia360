import type { World } from './world';

/**
 * De qué mundo es esta app. Expertalia 360 = profesionistas (con carrera y cédula).
 * La app de Oficios será este mismo código con MUNDO = 'oficios' y su propia marca
 * (los datos de oficios están guardados en paquetes/oficios). Así las dos apps comparten
 * todas las mejoras y el soporte se hace una sola vez.
 */
export const MUNDO: World = 'profesionales';

/** Con un solo mundo no se pregunta "¿profesional u oficio?" en ninguna pantalla */
export const UN_SOLO_MUNDO = true;
