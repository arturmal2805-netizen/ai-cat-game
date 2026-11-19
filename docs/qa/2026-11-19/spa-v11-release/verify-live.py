from pathlib import Path
import urllib.request,json,hashlib,re,gzip,subprocess,datetime
repo=Path('/workspace/chichi-spa-water-v11');out=repo/'docs/qa/2026-11-19/spa-v11-release/live';out.mkdir(exist_ok=True)
sha='9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce';run='44612746706'
workflow=json.loads(subprocess.check_output(['gh','run','view',run,'--repo','arturmal2805-netizen/ai-cat-game','--json','status,conclusion,jobs,headSha,url']))
assert workflow['status']=='completed' and workflow['conclusion']=='success',workflow
assert workflow['headSha']==sha
base='https://arturmal2805-netizen.github.io/ai-cat-game/'
records=[]
def fetch(path):
 req=urllib.request.Request(base+path+('?' if '?' not in path else '&')+'release_check='+sha,headers={'Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=45) as r:data=r.read();headers={k:r.headers.get(k) for k in ['ETag','Last-Modified','Content-Type','Cache-Control']}
 records.append({'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'headers':headers});return data
html=fetch('');text=html.decode();scripts=re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']',text);apps=[x for x in scripts if 'app.js' in x];assert len(apps)==1,apps
css=re.findall(r'<link\b[^>]*\bhref=["\']([^"\']+\.css(?:\?[^"\']*)?)["\']',text);assert len(css)==1,css
js=fetch(apps[0].removeprefix('./'));style=fetch(css[0].removeprefix('./'));atlas=fetch('art/spa-reflections/spa-interiors-ffabc732b641.png')
assert hashlib.sha256(js).hexdigest()=='593013c89da9d392e10c9a42a7ba7297e2073cccff5e3fc32951b930262e4dce'
assert hashlib.sha256(style).hexdigest()=='1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc'
assert hashlib.sha256(atlas).hexdigest()=='ffabc732b641d70c2894ca97ebff1ab83ba4fecbf6da71e5d0251efd19648d6f'
assert b'spa-interiors-ffabc732b641.png' in js
field=fetch('art/ocean-water/wind-field-2523d71db8b6.png')
expected_field='2523d71db8b62ce0212f4eb8bce5310456a901d69f209865c41f5f3dc2b692a8'
assert hashlib.sha256(field).hexdigest()==expected_field
assert b'wind-field-2523d71db8b6.png' in js
(out/'wind-field-2523d71db8b6.png').write_bytes(field)
assert b'resort-spa-call-all' in js
assert b'uSpaRefractionReady' in js
assert hashlib.sha256(html).hexdigest()=='7d8e29b489c6522e341085f6729878b80a662cbad0ffc8383b34bff9e4a62a5e'
assert '593013c89da9d392' in apps[0]
(out/'index.html').write_bytes(html);(out/'app.js.gz').write_bytes(gzip.compress(js,mtime=0));(out/'style.css').write_bytes(style);(out/'spa-interiors-ffabc732b641.png').write_bytes(atlas)
(out/'workflow.json').write_text(json.dumps(workflow,indent=2)+'\n')
receipt={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'release':sha,'workflow':workflow['url'],'applicationScripts':apps,'stylesheets':css,'resources':records,'limitations':'HTTP bytes and successful server release/save checks do not certify visual approval or hardware FPS. V11 optical profiles and free resident group invitations are included; exact reference likeness and dynamic cat reflections remain incomplete.'}
(out/'live-verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
