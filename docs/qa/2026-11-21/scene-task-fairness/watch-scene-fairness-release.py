import subprocess,json,time
from pathlib import Path
q=Path('/workspace/qa');sha='1e0ea4762167e0572c9c53121b975c6cd1ebbd70';run='44896468638'
with(q/'scene-fairness-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'scene-fairness-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-scene-fairness-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
