import subprocess,json,time
from pathlib import Path
q=Path('/workspace/qa');sha='d0d944acdc83ab69c1337d85e77c0471b044cb7a';run='44930181677'
with(q/'venue-camera-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'venue-camera-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-venue-camera-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
