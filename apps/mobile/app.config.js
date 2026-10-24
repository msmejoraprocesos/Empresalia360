// Extiende app.json con valores que dependen del entorno de compilación.
// GOOGLE_MAPS_API_KEY (opcional): llave de Google Maps para el mapa nativo en Android.
// Sin llave, la app usa un plano esquemático en lugar del mapa de Google para no cerrarse.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['react-native-maps', mapsKey ? { androidGoogleMapsApiKey: mapsKey } : {}]],
    // EXPO_WEB_BASE_URL (opcional): subcarpeta donde se publica la versión web, ej. /expertalia-360-app en GitHub Pages
    experiments: {
      ...(config.experiments ?? {}),
      ...(process.env.EXPO_WEB_BASE_URL ? { baseUrl: process.env.EXPO_WEB_BASE_URL } : {}),
    },
    extra: {
      ...(config.extra ?? {}),
      hasAndroidMapsKey: Boolean(mapsKey),
    },
  };
};
