from pathlib import Path
import urllib.request,json,hashlib,re,gzip,subprocess,datetime,sys
sha,run=sys.argv[1:3]
expected=json.loads(Path('/workspace/qa/venue-camera-expected-production.json').read_text())
out=Path('/workspace/qa/venue-camera-live');out.mkdir(exist_ok=True)
workflow=json.loads(subprocess.check_output(['gh','run','view',run,'--repo','arturmal2805-netizen/ai-cat-game','--json','status,conclusion,jobs,headSha,url']))
assert workflow['status']=='completed' and workflow['conclusion']=='success',workflow
assert workflow['headSha']==sha
for name in ['test','deploy','pages']:assert any(j['name']==name and j['conclusion']=='success' for j in workflow['jobs']),name
base='https://arturmal2805-netizen.github.io/ai-cat-game/'
records=[]
def fetch(path):
 req=urllib.request.Request(base+path+('?' if '?' not in path else '&')+'release_check='+sha,headers={'Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=45) as r:data=r.read();headers={k:r.headers.get(k) for k in ['ETag','Last-Modified','Content-Type','Cache-Control']}
 records.append({'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'headers':headers});return data
html=fetch('');text=html.decode();scripts=re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']',text);assert len(scripts)==1 and 'dist/app.js' in scripts[0],scripts
css=re.findall(r'<link\b[^>]*\bhref=["\']([^"\']+\.css(?:\?[^"\']*)?)["\']',text);assert len(css)==1,css
js=fetch(scripts[0].removeprefix('./'));style=fetch(css[0].removeprefix('./'))
for name,data in [('index.html',html),('dist/app.js',js),('style.css',style)]:assert hashlib.sha256(data).hexdigest()==expected[name]['sha256'],name
assert 'v='+expected['dist/app.js']['sha256'][:16] in scripts[0]
assert 'v='+expected['style.css']['sha256'][:16] in css[0]
for path in [p for p in expected if p.startswith('art/')]:
 data=fetch(path);assert hashlib.sha256(data).hexdigest()==expected[path]['sha256'];assert Path(path).name.encode() in js;(out/Path(path).name).write_bytes(data)
for path in [p for p in expected if p.startswith('models/')]:
 data=fetch(path);assert hashlib.sha256(data).hexdigest()==expected[path]['sha256'];assert Path(path).name.removesuffix('.gz').encode() in js
# Preserve and verify the pre-existing SPA/water field as well as the new coast probe.
for path,digest in [('art/spa-reflections/spa-interiors-ffabc732b641.png','ffabc732b641d70c2894ca97ebff1ab83ba4fecbf6da71e5d0251efd19648d6f'),('art/ocean-water/wind-field-2523d71db8b6.png','2523d71db8b62ce0212f4eb8bce5310456a901d69f209865c41f5f3dc2b692a8')]:
 data=fetch(path);assert hashlib.sha256(data).hexdigest()==digest;assert Path(path).name.encode() in js
assert b'resort-spa-call-all' in js and b'warehouse-access' in js
assert b'.venue-access' in style
assert b'warehouse-illuminated-facade-v1' in js
assert b'Warehouse seabed coral gardens' in js
assert b'force-cache' in js
(out/'index.html').write_bytes(html);(out/'app.js.gz').write_bytes(gzip.compress(js,mtime=0));(out/'style.css').write_bytes(style)
(out/'workflow.json').write_text(json.dumps(workflow,indent=2))
receipt={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':sha,'candidate':expected['source'],'workflow':workflow['url'],'applicationScripts':scripts,'stylesheets':css,'resources':records,'limitations':'Actual HTTP bytes, completed release/save workflow and native geometry checks do not establish artistic approval or physical Mac/iPhone FPS.'}
(out/'live-verification.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2))
