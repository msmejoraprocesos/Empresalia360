// Punto de entrada. Antes de cargar la app instala un manejador de errores:
// si algo falla al arrancar, en lugar de cerrarse la app muestra el mensaje
// para poder corregirlo (en versiones de prueba).
const { Alert } = require('react-native');

const previous = global.ErrorUtils?.getGlobalHandler?.();
let shown = false;
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  if (!shown) {
    shown = true;
    const message = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n\n${String(error?.stack ?? '').split('\n').slice(0, 6).join('\n')}`;
    Alert.alert(isFatal ? 'Expertalia 360 no pudo arrancar' : 'Error en Expertalia 360', message);
  }
  if (!isFatal && previous) previous(error, isFatal);
});

require('expo-router/entry');
