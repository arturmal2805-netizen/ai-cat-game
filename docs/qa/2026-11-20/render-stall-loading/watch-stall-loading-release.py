import subprocess,json,time
from pathlib import Path
q=Path('/workspace/qa');sha='6ccec70440b551ff6c3c06a98945ff7d5d168db0';run='44804905460'
with(q/'stall-loading-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'stall-loading-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-stall-loading-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
