import os,time,json,subprocess
from pathlib import Path
q=Path('/workspace/qa');needle=b'node\0/workspace/qa/check-stall-map.cjs\0';pids=[]
for p in Path('/proc').iterdir():
 if p.name.isdigit():
  try:
   if p.joinpath('cmdline').read_bytes()==needle:pids.append(int(p.name))
  except OSError:pass
assert len(pids)<=1,pids
while pids and Path('/proc/'+str(pids[0])).exists():time.sleep(3)
r=json.loads((q/'scene-fairness-all-map/native-map-frames.json').read_text());assert len(r)==21 and len({x['id'] for x in r})==19
assert all(x['frames']>=3 and x['dpr']==2 and not x['contextLost'] and x['orbitRange']>.08 and x['zoomRange']>6 for x in r)
e=json.loads((q/'scene-fairness-all-map/browser-errors.json').read_text());assert not e['errors'] and not e['httpErrors'],e
print('All-map native PASS; launching phone after GPU job exit',flush=True)
env=dict(os.environ);env['PATH']='/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:'+env['PATH']
env.update(NODE_OPTIONS='--require=/workspace/qa/native-readonly-hardlinks.cjs',CHICHI_PLAYWRIGHT_MODULE='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',CHICHI_CHROMIUM='/usr/bin/chromium',CHICHI_EXPLORER_AUDIT='1',CHICHI_V12_AUDIT='1',CHICHI_V12_PHONE_ONLY='1',CHICHI_WAREHOUSE_OPEN_WATER_AUDIT='1',CHICHI_VISUAL_IDLE_AUDIT='1',CHICHI_PROFILE_QUERY='review=1',CHICHI_QA_DPR='2',CHICHI_PRIVATE_SAVE_FIXTURE='/workspace/qa/warehouse-open-water-private-fixture.json',CHICHI_REVIEW_DIR='/workspace/qa/scene-fairness-phone')
with (q/'scene-fairness-phone.log').open('w') as log:subprocess.run(['node','scripts/check-aquarium.cjs'],cwd='/workspace/chichi-v12-island-warehouse',env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
print('Phone native PASS',flush=True)
