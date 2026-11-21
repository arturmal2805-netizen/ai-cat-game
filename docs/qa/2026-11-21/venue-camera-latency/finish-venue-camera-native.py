import os,time,json,subprocess
from pathlib import Path
q=Path('/workspace/qa');root=Path('/workspace/chichi-v12-island-warehouse')
def running(needle):
 found=[]
 for p in Path('/proc').iterdir():
  if p.name.isdigit():
   try:
    if p.joinpath('cmdline').read_bytes()==needle:found.append(p)
   except OSError:pass
 assert len(found)<=1,found
 return found
for _ in range(180):
 if running(b'node\0/workspace/qa/check-venue-latency-final.cjs\0') or (q/'venue-latency-final/venue-native.json').exists():break
 time.sleep(1)
else:raise RuntimeError('Desktop native runner did not start')
while running(b'node\0/workspace/qa/check-venue-latency-final.cjs\0'):time.sleep(3)
assert json.loads((q/'venue-latency-final/venue-native.json').read_text())['errors']==[]
print('Desktop cold/cancel/framing PASS; starting full map',flush=True)
env=dict(os.environ);env['PATH']='/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:'+env['PATH']
env.update(NODE_PATH=str(root/'node_modules'),NODE_OPTIONS='--require=/workspace/qa/native-readonly-hardlinks.cjs',CHICHI_PLAYWRIGHT_MODULE='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',CHICHI_CHROMIUM='/usr/bin/chromium',CHICHI_PROFILE_QUERY='review=1',CHICHI_QA_DPR='2')
mapenv=dict(env,CHICHI_NATIVE_MAP_AUDIT='1',CHICHI_MAP_CHECK='1',CHICHI_QA_ROSTER='18',CHICHI_NATIVE_SAMPLE_MS='800',CHICHI_NATIVE_MIN_FRAMES='3',CHICHI_NATIVE_REPEATS='autumn,homestead',CHICHI_NATIVE_MAP_CAPTURE='1',CHICHI_DESKTOP='1',CHICHI_REVIEW_DIR=str(q/'venue-camera-all-map'))
with(q/'venue-camera-all-map.log').open('w')as log:subprocess.run(['node',str(q/'check-venue-map.cjs')],cwd=root,env=mapenv,stdout=log,stderr=subprocess.STDOUT,check=True)
r=json.loads((q/'venue-camera-all-map/native-map-frames.json').read_text());assert len(r)==21 and len({x['id']for x in r})==19
assert all(x['frames']>=3 and x['dpr']==2 and not x['contextLost'] and x['orbitRange']>.08 and x['zoomRange']>6 for x in r)
e=json.loads((q/'venue-camera-all-map/browser-errors.json').read_text());assert not e['errors'] and not e['httpErrors']
print('All-map native PASS; starting phone cold/cancel/framing/movement/reloads',flush=True)
phoneenv=dict(env,CHICHI_EXPLORER_AUDIT='1',CHICHI_CACHE_TRACE='1',CHICHI_V12_PHONE_ONLY='1',CHICHI_WAREHOUSE_OPEN_WATER_AUDIT='1',CHICHI_VISUAL_IDLE_AUDIT='1',CHICHI_PRIVATE_SAVE_FIXTURE=str(q/'warehouse-open-water-private-fixture.json'),CHICHI_REVIEW_DIR=str(q/'venue-camera-phone'))
with(q/'venue-camera-phone.log').open('w')as log:subprocess.run(['node',str(q/'check-venue-latency-final.cjs')],cwd=root,env=phoneenv,stdout=log,stderr=subprocess.STDOUT,check=True)
r=json.loads((q/'venue-camera-phone/warehouse-open-water-movement.json').read_text());assert len(r['rows'])==8 and len(r['restores'])==2
assert json.loads((q/'venue-camera-phone/venue-native.json').read_text())['errors']==[]
print('All native gates PASS',flush=True)
