import subprocess,json,time
from pathlib import Path
q=Path('/workspace/qa');sha='c199697c2bcf3d18efc3b250f71c1171badc8516';run='44894584877'
with(q/'visible-model-shader-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'visible-model-shader-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-visible-model-shaders-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
