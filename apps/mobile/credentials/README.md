# Llave de firma para APKs de prueba

`android-preview.jks` firma los APK del perfil `preview` de EAS (`credentialsSource: local` en `eas.json`,
datos en `credentials.json`). Sirve solo para instalar versiones de prueba desde el enlace de Expo.

Para publicar en Google Play se usa el perfil `production` con una llave administrada por EAS
(no esta). El repositorio es privado; si alguna vez se vuelve público, borra esta carpeta y
`credentials.json` y genera una llave nueva.
