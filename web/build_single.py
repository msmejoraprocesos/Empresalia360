"""Empaqueta la exportación web de Expo en un solo HTML autocontenido para publicarlo como página."""
import base64, glob, mimetypes, os, re, sys
web, out = sys.argv[1], sys.argv[2]
js = open(glob.glob(f'{web}/_expo/static/js/web/*.js')[0], encoding='utf-8').read()

def to_data(m):
    path = m.group(1)
    f = os.path.join(web, path.lstrip('/'))
    mime = mimetypes.guess_type(f)[0] or ('font/ttf' if f.endswith('.ttf') else 'application/octet-stream')
    if f.endswith('.ttf'): mime = 'font/ttf'
    return '"data:%s;base64,%s"' % (mime, base64.b64encode(open(f, 'rb').read()).decode())

MH = """window.__MH=(function(){var O='https://expertalia360.app',st=[{s:null,p:'/'}],i=0;
function norm(u){var x=new URL(String(u),O+st[i].p);return x.pathname+x.search+x.hash}
function fire(){try{window.dispatchEvent(new PopStateEvent('popstate',{state:st[i].s}))}catch(e){}}
return{origin:O,get state(){return st[i].s},
pushState:function(s,_,u){var p=u==null?st[i].p:norm(u);st=st.slice(0,i+1);st.push({s:s,p:p});i++},
replaceState:function(s,_,u){st[i]={s:s,p:u==null?st[i].p:norm(u)}},
go:function(d){var n=Math.max(0,Math.min(st.length-1,i+d));if(n!==i){i=n;setTimeout(fire,0)}},
back:function(){this.go(-1)},
loc:function(){var u=new URL(st[i].p,O);return{pathname:u.pathname,search:u.search,hash:u.hash}},
href:function(){return O+st[i].p}}})();"""
PATCHES = [
  ("function t(){const t=window.history.state?.id,{pathname:n,search:o,hash:s}=window.location;",
   "function t(){const t=__MH.state?.id,{pathname:n,search:o,hash:s}=__MH.loc();"),
  ("const n=[],o=(t,n)=>{window.history.replaceState({id:t},'',n)};", "const n=[],o=(t,n)=>{__MH.replaceState({id:t},'',n)};"),
  ("void(window.history.state?.id!==p?window.history.pushState({id:p},'',c):window.history.replaceState({id:p},'',c))",
   "void(__MH.state?.id!==p?__MH.pushState({id:p},'',c):__MH.replaceState({id:p},'',c))"),
  ("window.addEventListener('popstate',c),window.history.go(s)", "window.addEventListener('popstate',c),__MH.go(s)"),
  ("?new URL(window.location.href):void 0;function k(", "?new URL(__MH.href()):void 0;function k("),
  ("if('web'===n().Platform.OS&&window.location?.href)return window.location.href;", "if('web'===n().Platform.OS)return __MH.href();"),
  ("getInitialURL:async()=>'undefined'==typeof window?'':window.location.href", "getInitialURL:async()=>'undefined'==typeof window?'':__MH.href()"),
  ("const o=new URL(n,window.location.origin);", "const o=new URL(n,__MH.origin);"),
]
for a, b in PATCHES:
    assert js.count(a) == 1, ('patch not found once', a[:60], js.count(a))
    js = js.replace(a, b)
# Compatibilidad con navegadores de teléfonos más viejos (Chrome 70+, Safari 13+), después de los parches
import subprocess, tempfile
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tmp:
    tmp.write(js)
subprocess.run([os.environ.get('ESBUILD', 'npx'), *([] if os.environ.get('ESBUILD') else ['--yes', 'esbuild@0.25.0']), tmp.name, '--target=chrome70,safari13,firefox68,edge79', '--charset=utf8', '--legal-comments=none', '--minify', '--log-level=warning', '--outfile=' + tmp.name + '.low'], check=True)
js = open(tmp.name + '.low', encoding='utf-8').read()
js, n = re.subn(r'"(/assets/[^"]+)"', to_data, js)
js = js.replace('</script', '<\\/script').replace('<!--', '<\\!--')
html = f'''<title>Expertalia 360</title>
<meta name="description" content="Maqueta navegable de Expertalia 360">
<style>
:root {{ --stage: #E6EBF3; --ink: #121A2B; --muted: #56607A; --app-bg: #F4F6FA; }}
html, body {{ height: 100%; }}
body {{ background: var(--stage); color: var(--ink); overflow: hidden; }}
#stage {{ height: 100%; display: flex; justify-content: center; }}
#phone {{ position: relative; width: 100%; max-width: 430px; height: 100%; background: var(--app-bg); overflow: hidden; display: flex; }}
#root {{ display: flex; flex: 1; height: 100%; min-width: 0; }}
@media (min-width: 640px) {{
  #stage {{ align-items: center; padding-block: 24px; box-sizing: border-box; }}
  #phone {{ height: min(880px, 100%); border-radius: 36px; box-shadow: 0 0 0 10px #121A2B, 0 24px 60px rgba(18,26,43,0.35); }}
  /* Las ventanas emergentes de la app se dibujan fuera de #phone; aquí se encierran en el mismo marco */
  body > div:not(#stage) {{ position: fixed !important; left: 50% !important; top: 50% !important; right: auto !important; bottom: auto !important;
    width: 430px !important; height: min(880px, calc(100% - 48px)) !important; transform: translate(-50%, -50%); border-radius: 36px; overflow: hidden; }}
}}
</style>
<div id="stage"><div id="phone"><div id="root"></div></div></div>
<script>{MH}</script>
<script>{js}</script>
'''
open(out, 'w', encoding='utf-8').write(html)
print('assets inlined:', n, 'size MB:', round(len(html.encode())/1e6, 2))
