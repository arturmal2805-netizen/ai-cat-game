import subprocess,json,time
from pathlib import Path
q=Path('/workspace/qa');sha='15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992';run='44914901033'
with(q/'active-refault-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'active-refault-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-active-refault-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
