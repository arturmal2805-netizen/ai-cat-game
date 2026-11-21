import json,collections,hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
r={'scope':'One sequential exact-source native expanded-overview/clock7/desktopDPR1 comparison, software Chromium156. Not physical M2 FPS and not an explanation of the 8.6s user gap. Actors can animate independently.','profiles':[]}
for role in ['baseline','candidate']:
 p=json.loads(Path('/workspace/qa/shader-miss-'+role+'/shader-misses.json').read_text());a=[x for x in p if x['draw']];by=collections.defaultdict(list)
 for x in a:by[x['draw']['ancestors'][-2]].append(x)
 r['profiles'].append({'role':role,'visibleFirstUseCount':len(a),'visibleFirstUseTotalMs':sum(x['ms'] for x in a),'roots':{k:{'calls':len(v),'ms':sum(x['ms'] for x in v)} for k,v in by.items()}})
a=Image.open('/workspace/qa/shader-miss-baseline/expanded-overview.png').convert('RGB');b=Image.open('/workspace/qa/shader-miss-candidate/expanded-overview.png').convert('RGB');r['image']={'view':'expanded-overview','size':a.size,'meanAbsoluteChannelDifference':ImageStat.Stat(ImageChops.difference(a,b)).mean,'exactPixels':a.tobytes()==b.tobytes()}
Path('/workspace/qa/visible-model-shader-comparison.json').write_text(json.dumps(r,indent=2))
e=json.loads(Path('/workspace/qa/stall-loading-expected-production.json').read_text());e['source']='fef392422062766450651067ea2eeb7f6d1112d6';pub=Path('/workspace/chichi-v12-island-warehouse/public')
for path in ['index.html','dist/app.js','style.css']:
 data=(pub/path).read_bytes();e[path]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
Path('/workspace/qa/visible-model-shader-expected-production.json').write_text(json.dumps(e,indent=2));print(e['dist/app.js'])
s=Path('/workspace/qa/verify-stall-loading-live.py').read_text().replace('stall-loading-expected-production.json','visible-model-shader-expected-production.json').replace("qa/stall-loading-live'","qa/visible-model-shader-live'")
Path('/workspace/qa/verify-visible-model-shaders-live.py').write_text(s)
