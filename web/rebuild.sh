#!/usr/bin/env bash
# Compila la app y arma la web instalable (PWA) para GitHub Pages en la raíz del repositorio.
#   bash web/rebuild.sh            -> index.html, 404.html, sw.js, manifest e íconos en la raíz
#   bash web/rebuild.sh maqueta.html -> además deja una copia de una sola pieza (sin PWA) en esa ruta
# Para conectar Supabase, crea apps/mobile/.env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY antes de correrlo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/expertalia-web"
mkdir -p "$TMP"
cd "$ROOT/apps/mobile"
cp app.json "$TMP/app.json.bak"
trap 'cp "$TMP/app.json.bak" "$ROOT/apps/mobile/app.json"' EXIT
python3 - <<'P'
import json
d=json.load(open('app.json')); pl=d['expo']['plugins']
pl[pl.index('expo-router')]=['expo-router',{'asyncRoutes':{'web':False,'default':'development'}}]
json.dump(d,open('app.json','w'),indent=2,ensure_ascii=False)
P
rm -rf "$TMP/out"
npx expo export --platform web --output-dir "$TMP/out" > "$TMP/export.log" 2>&1 || { tail -30 "$TMP/export.log"; exit 1; }
python3 "$ROOT/web/build_single.py" "$TMP/out" "$TMP/app.html"
python3 - "$ROOT" "$TMP/app.html" "${1:-}" <<'P'
import sys, os, shutil, time
root, app, maqueta = sys.argv[1], sys.argv[2], sys.argv[3]
body = open(app, encoding='utf-8').read()
def page(extra):
    return ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#1F3A68">\n'
            '<style>body{margin:0;font:14px system-ui,-apple-system,sans-serif}</style>\n'
            + extra + '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
pwa = page(open(os.path.join(root, 'web/pwa-head.html'), encoding='utf-8').read())
for f in ['index.html', '404.html']:
    open(os.path.join(root, f), 'w', encoding='utf-8').write(pwa)
shutil.copy(os.path.join(root, 'web/manifest.webmanifest'), root)
sw = open(os.path.join(root, 'web/sw.js'), encoding='utf-8').read().replace('__VERSION__', time.strftime('%Y%m%d%H%M%S'))
open(os.path.join(root, 'sw.js'), 'w', encoding='utf-8').write(sw)
shutil.copytree(os.path.join(root, 'web/icons'), os.path.join(root, 'icons'), dirs_exist_ok=True)
open(os.path.join(root, '.nojekyll'), 'w').close()
if maqueta:
    open(maqueta, 'w', encoding='utf-8').write(body)
print('Listo:', round(len(pwa) / 1e6, 2), 'MB')
P
