import json
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
out=Path('/workspace/qa/stall-loading-profile-comparison.json')
r={'profiles':[],'images':[], 'scope':'One sequential CDP CPU diagnostic per version, sampling interval 1000us, same four actual-game cameras/clock7/desktopDPR1, Chromium156/SwiftShader/private Worker. Not physical M2 FPS. Animated actors can differ between runs.'}
for role in ['baseline','candidate','fast']:
 d=json.loads(Path(f'/workspace/qa/render-stall-{role}/startup.cpuprofile').read_text());nodes={n['id']:n for n in d['nodes']};parents={c:n['id'] for n in d['nodes'] for c in n.get('children',[])};tot=[0,0,0]
 for sample,delta in zip(d['samples'],d['timeDeltas']):
  names=[];i=sample
  while i in nodes:
   names.append(nodes[i]['callFrame']['functionName']);i=parents.get(i)
  renderer='projectObject' in names
  if renderer and 'computeBoundingSphere' in names:tot[0]+=delta
  if 'geometryBoundsSteps2' in names:tot[1]+=delta
  if 'WebGLRenderer.render' in names:tot[2]+=delta
 r['profiles'].append({'role':role,'lazyBoundsUnderRendererMs':round(tot[0]/1000,2),'newPreparationMs':round(tot[1]/1000,2),'rendererInclusiveMs':round(tot[2]/1000,2)})
for role in ['candidate','fast']:
 for view in ['expanded-overview','warehouse-cleared-banks','warehouse-front','open-water-gap']:
  a=Image.open(f'/workspace/qa/render-stall-baseline/{view}.png').convert('RGB');b=Image.open(f'/workspace/qa/render-stall-{role}/{view}.png').convert('RGB');diff=ImageChops.difference(a,b)
  r['images'].append({'role':role,'view':view,'size':a.size,'meanAbsoluteChannelDifference':ImageStat.Stat(diff).mean,'exactPixels':diff.getbbox() is None})
out.write_text(json.dumps(r,indent=2));print(json.dumps(r['profiles'],indent=2));print('final pixel differences',[(d['view'],d['meanAbsoluteChannelDifference']) for d in r['images'] if d['role']=='fast'])
