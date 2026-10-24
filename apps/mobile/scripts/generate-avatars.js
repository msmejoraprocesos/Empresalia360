/**
 * Genera las caras ilustradas de los perfiles de ejemplo (estilo "Personas" de DiceBear,
 * por Draftbot, licencia CC BY 4.0). Correr: node scripts/generate-avatars.js
 */
const fs = require('fs');
const path = require('path');
const { createAvatar } = require('@dicebear/core');
const { personas } = require('@dicebear/collection');

const W = (hair, extra = {}) => ({ hair: [hair], facialHairProbability: 0, ...extra });
const M = (hair, beard, extra = {}) => ({ hair: [hair], facialHair: beard ? [beard] : undefined, facialHairProbability: beard ? 100 : 0, ...extra });

const PEOPLE = {
  'lic-mariana-ortiz': W('long', { skinColor: ['e5a07e'], hairColor: ['362c47'], clothingColor: ['456dff'], mouth: ['smile'], eyes: ['open'], bg: 'dbe4f2' }),
  'ortiz-salinas-abogados': M('shortCombover', 'shadow', { skinColor: ['d78774'], hairColor: ['362c47'], clothingColor: ['7555ca'], mouth: ['smile'], eyes: ['glasses'], bg: 'dbe4f2' }),
  'lic-roberto-campos': M('fade', 'goatee', { skinColor: ['b16a5b'], hairColor: ['362c47'], clothingColor: ['456dff'], mouth: ['bigSmile'], eyes: ['open'], bg: 'dbe4f2' }),
  'lic-daniela-trevino': W('bobCut', { skinColor: ['eeb4a4'], hairColor: ['6c4545'], clothingColor: ['e24553'], mouth: ['smile'], eyes: ['happy'], bg: 'dbe4f2' }),
  'despacho-contable-reyes': M('balding', 'beardMustache', { skinColor: ['e5a07e'], hairColor: ['6c4545'], clothingColor: ['6dbb58'], mouth: ['smile'], eyes: ['glasses'], bg: 'ddf1ea' }),
  'cp-laura-mendez': W('curlyBun', { skinColor: ['d78774'], hairColor: ['362c47'], clothingColor: ['54d7c7'], mouth: ['bigSmile'], eyes: ['open'], bg: 'ddf1ea' }),
  'notaria-publica-14': M('shortComboverChops', 'walrus', { skinColor: ['e7a391'], hairColor: ['dee1f5'], clothingColor: ['456dff'], mouth: ['smile'], eyes: ['glasses'], bg: 'fbf0d9' }),
  'traducciones-peritas-morales': W('straightBun', { skinColor: ['e7a391'], hairColor: ['6c4545'], clothingColor: ['f3b63a'], mouth: ['smile'], eyes: ['glasses'], bg: 'fbf0d9' }),
  'psic-andrea-vidal': W('extraLong', { skinColor: ['eeb4a4'], hairColor: ['f29c65'], clothingColor: ['f55d81'], mouth: ['smile'], eyes: ['happy'], bg: 'f8e1eb' }),
  'arq-diego-fuentes': M('curly', 'shadow', { skinColor: ['e5a07e'], hairColor: ['362c47'], clothingColor: ['f3b63a'], mouth: ['smirk'], eyes: ['open'], bg: 'e2e7ef' }),
  'patricia-luna-seguros': W('bobBangs', { skinColor: ['d78774'], hairColor: ['362c47'], clothingColor: ['7555ca'], mouth: ['bigSmile'], eyes: ['open'], bg: 'e9e2fa' }),
  'rumbo-consultores': M('buzzcut', 'beardMustache', { skinColor: ['92594b'], hairColor: ['362c47'], clothingColor: ['7555ca'], mouth: ['smile'], eyes: ['open'], bg: 'e9e2fa' }),
  'plomeria-hernandez': M('cap', 'walrus', { skinColor: ['b16a5b'], hairColor: ['362c47'], clothingColor: ['456dff'], mouth: ['bigSmile'], eyes: ['open'], bg: 'dfebfd' }),
  'electrica-ramirez': M('beanie', 'goatee', { skinColor: ['d78774'], hairColor: ['362c47'], clothingColor: ['f3b63a'], mouth: ['smile'], eyes: ['open'], bg: 'fbf0d9' }),
  'carpinteria-don-chuy': M('balding', 'beardMustache', { skinColor: ['b16a5b'], hairColor: ['dee1f5'], clothingColor: ['e24553'], mouth: ['smile'], eyes: ['happy'], bg: 'f1e4d6' }),
  'climas-del-bajio': M('fade', null, { skinColor: ['e5a07e'], hairColor: ['362c47'], clothingColor: ['54d7c7'], mouth: ['smile'], eyes: ['open'], bg: 'dcf1f5' }),
  'acabados-mendoza': M('cap', 'beardMustache', { skinColor: ['92594b'], hairColor: ['362c47'], clothingColor: ['6dbb58'], mouth: ['bigSmile'], eyes: ['open'], bg: 'ddf1ea' }),
  'cerrajeria-llave-maestra': M('shortCombover', 'pyramid', { skinColor: ['e7a391'], hairColor: ['6c4545'], clothingColor: ['f3b63a'], mouth: ['smile'], eyes: ['open'], bg: 'e2e7ef' }),
  usuario: W('long', { skinColor: ['e5a07e'], hairColor: ['6c4545'], clothingColor: ['f55d81'], mouth: ['bigSmile'], eyes: ['open'], bg: 'ffffff' }),
};

const out = path.join(__dirname, '..', 'assets', 'avatars');
fs.mkdirSync(out, { recursive: true });
const lines = ['/** Caras ilustradas de los perfiles de ejemplo ("Personas" de DiceBear por Draftbot, CC BY 4.0). Generado por scripts/generate-avatars.js */', 'export const AVATARS: Record<string, number> = {'];
for (const [slug, o] of Object.entries(PEOPLE)) {
  const { bg, ...opts } = o;
  const svg = createAvatar(personas, { seed: slug, backgroundColor: [bg], body: ['rounded'], nose: ['smallRound'], ...opts }).toString();
  fs.writeFileSync(path.join(out, `${slug}.svg`), svg);
  lines.push(`  '${slug}': require('../../assets/avatars/${slug}.svg'),`);
}
lines.push('};', '');
fs.writeFileSync(path.join(__dirname, '..', 'src', 'constants', 'avatars.ts'), lines.join('\n'));
console.log(Object.keys(PEOPLE).length, 'caras');
