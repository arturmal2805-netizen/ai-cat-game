from pathlib import Path
import urllib.request,json,hashlib,re,gzip,subprocess,datetime,sys,os
sha,run=sys.argv[1:3]
expected=json.loads(Path('/workspace/qa/warehouse-access-expected-production.json').read_text())
out=Path('/workspace/qa/warehouse-access-live-final');out.mkdir(exist_ok=True)
workflow=json.loads(subprocess.check_output(['gh','run','view',run,'--repo','arturmal2805-netizen/ai-cat-game','--json','status,conclusion,jobs,headSha,url']))
assert workflow['status']=='completed' and workflow['conclusion']=='success',workflow
assert workflow['headSha']==sha
for name in ['test','deploy','pages']:assert any(j['name']==name and j['conclusion']=='success' for j in workflow['jobs']),name
shards=[j for j in workflow['jobs'] if j['name'].startswith('test-shards (')]
assert len(shards)==3 and all(j['conclusion']=='success' for j in shards),'all three complete-suite shards must pass'
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
for marker in [b'waterfront-elastic-net-v4-pinned-bowl',b'waterfrontAllTrampoline',b'waterfrontPlayer',b'waterfrontDive',b'waterfront-view-toggle']:
 assert marker in js,marker
assert b'.waterfront-jump' in style and b'.waterfront-view-toggle' in style
assert b'warehouse-illuminated-facade-v1' in js
assert b'Warehouse seabed coral gardens' in js
assert b'force-cache' in js
for marker in [b'warehouseCall',b'warehouseControl',b'warehouseReturn',b'warehouse-explore',b'warehouse-rest',b'Warehouse deployable docking gangplank']:
 assert marker in js,marker
config=fetch('config.js').decode();api=json.loads(re.search(r'apiBase\s*=\s*("[^"\n]+")',config).group(1))
# Worker destination is outside this environment's allowlist. Verify deployed
# code through the allowed management endpoint; workflow tested status+saves.
req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/workers/scripts/chichi-cat-world',headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN']})
with urllib.request.urlopen(req,timeout=45) as response:
 deployed=response.read();contentType=response.headers.get('Content-Type')
assert sha.encode() in deployed,'actual deployed Worker lacks full release SHA'
worker={'api':api,'release':sha,'proof':'Actual deployed source via Cloudflare management API; completed Actions workflow separately verified status and shared saves.','bytes':len(deployed),'sha256':hashlib.sha256(deployed).hexdigest(),'contentType':contentType,'directStatus':'Not repeated: workers.dev is outside the environment allowlist.','paidInferenceCalled':False}
(out/'worker-management.json').write_text(json.dumps(worker,indent=2))
(out/'index.html').write_bytes(html);(out/'app.js.gz').write_bytes(gzip.compress(js,mtime=0));(out/'style.css').write_bytes(style)
(out/'workflow.json').write_text(json.dumps(workflow,indent=2))
receipt={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':sha,'candidate':expected['source'],'workflow':workflow['url'],'applicationScripts':scripts,'stylesheets':css,'resources':records,'workerRelease':worker['release'],'paidInferenceCalled':False,'limitations':'Actual HTTP bytes, completed release/save workflow and native geometry checks do not establish artistic approval or physical Mac/iPhone FPS.'}
(out/'live-verification.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2))
