#!/usr/bin/env bash
# Compila la versión web para GitHub Pages (https://msmejoraprocesos.github.io/expertalia-360-app/)
# y la deja en la carpeta indicada, lista para subir al repositorio público expertalia-360-app.
#   bash scripts/publish-web.sh ../../../expertalia-360-app
set -euo pipefail
OUT="${1:?Indica la carpeta de salida}"
cd "$(dirname "$0")/.."
rm -rf "$OUT/_expo" "$OUT/assets"
EXPO_WEB_BASE_URL=/expertalia-360-app npx expo export --platform web --output-dir "$OUT"
cp "$OUT/index.html" "$OUT/404.html"   # para que funcionen las ligas directas (ej. /negocio/cafe-la-esquina)
touch "$OUT/.nojekyll"                 # GitHub Pages ignora carpetas que empiezan con _ sin este archivo
echo "Listo en $OUT"
