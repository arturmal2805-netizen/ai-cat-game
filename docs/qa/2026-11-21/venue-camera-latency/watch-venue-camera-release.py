import subprocess,json,time,threading
from pathlib import Path
q=Path('/workspace/qa');sha='abd2305e6234f42e9bcc5e0be41ca5dd8c6d9561';run='44928862404'
def native_guard():
 while True:
  p=q/'venue-camera-native-finish.log'
  status=p.read_text() if p.exists() else ''
  if 'All native gates PASS' in status:return
  if 'Traceback' in status:
   subprocess.run(['gh','run','cancel',run,'--repo','arturmal2805-netizen/ai-cat-game'])
   print('Native gate failed; cancelled release workflow before claiming publication',flush=True)
   return
  time.sleep(10)
threading.Thread(target=native_guard,daemon=True).start()
with(q/'venue-camera-main-ci-watch.log').open('w')as log:subprocess.run(['gh','run','watch',run,'--repo','arturmal2805-netizen/ai-cat-game','--exit-status','--interval','20'],stdout=log,stderr=subprocess.STDOUT,check=True)
for i in range(6):
 with(q/'venue-camera-live-verifier.log').open('w')as log:r=subprocess.run(['python','/workspace/qa/verify-venue-camera-live.py',sha,run],stdout=log,stderr=subprocess.STDOUT)
 if r.returncode==0:break
 if i==5:raise RuntimeError('Actual HTTP bytes not verified')
 time.sleep(15)
print('Published and verified actual HTTP bytes',sha,run,flush=True)
