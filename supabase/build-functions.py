#!/usr/bin/env python3
"""Arma una versión de un solo archivo de cada función (supabase/functions-pegar/<nombre>.ts)
para pegarla en Supabase → Edge Functions → Deploy a new function → Via Editor, sin instalar nada."""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
util = open(os.path.join(here, 'functions/_shared/util.ts'), encoding='utf-8').read()
out_dir = os.path.join(here, 'functions-pegar')
os.makedirs(out_dir, exist_ok=True)
for name in sorted(os.listdir(os.path.join(here, 'functions'))):
    src = os.path.join(here, 'functions', name, 'index.ts')
    if name.startswith('_') or not os.path.exists(src):
        continue
    code = open(src, encoding='utf-8').read()
    code = re.sub(r"^import \{[^}]*\} from '\.\./_shared/util\.ts';\n", '', code, flags=re.M)
    head = code.split('\nimport', 1)[0] if code.startswith('//') else ''
    body = (
        f'// Expertalia 360 · {name} (versión de un solo archivo para pegar en el editor de Supabase)\n'
        f'// Generado por supabase/build-functions.py; el original está en supabase/functions/{name}/index.ts\n\n'
        + util + '\n// ───────────── ' + name + ' ─────────────\n' + code
    )
    open(os.path.join(out_dir, f'{name}.ts'), 'w', encoding='utf-8').write(body)
    print('functions-pegar/' + name + '.ts')
