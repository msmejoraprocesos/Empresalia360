#!/usr/bin/env bash
# Une migraciones y datos en supabase/setup.sql (un solo archivo para pegar en el SQL Editor).
set -euo pipefail
cd "$(dirname "$0")"
{
  echo '-- Expertalia 360 · instalación completa en un proyecto nuevo de Supabase'
  echo '-- Pega este archivo completo en Supabase → SQL Editor → New query → Run (una sola vez).'
  echo '-- Generado por supabase/build-setup.sh a partir de supabase/migrations, seed.sql y seed_demo.sql.'
  echo
  for f in migrations/*.sql seed.sql seed_demo.sql; do
    echo "-- ════════ supabase/$f ════════"
    cat "$f"
    echo
  done
} > setup.sql
echo "setup.sql: $(wc -l < setup.sql) líneas"
python3 build-functions.py > /dev/null && echo "functions-pegar: listas"
