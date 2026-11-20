from pathlib import Path
import subprocess,hashlib,tarfile,json,os,sys,datetime
folder,role,candidate,state=sys.argv[1:];src=Path(folder);repo=Path('/workspace/chichi-v12-island-warehouse');out=Path('/workspace/chichi-shared-water/docs/qa/2026-11-20/render-stall-loading')/role;out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((src/'source-files.json').read_text())
for name,digest in manifest.items():assert hashlib.sha256(subprocess.check_output(['git','show',candidate+':public/'+name],cwd=repo)).hexdigest()==digest,name
for p in list(src.glob('*.png'))+list(src.glob('*.json'))+[src/n for n in ['source-status.txt']]:
 if p.exists() and not(out/p.name).exists():os.link(p,out/p.name)
with tarfile.open(out/'source-proof.tar.gz','w:gz')as t:
 for name in ['source','qa-app.js','source-HEAD.patch','source-cached.patch','source-status.txt']:
  if(src/name).exists():t.add(src/name,arcname=name)
if (src/'startup.cpuprofile').exists():
 import gzip
 with gzip.open(out/'startup.cpuprofile.gz','wb') as f:f.write((src/'startup.cpuprofile').read_bytes())
for name in ['scripts/check-native-map-frames.mjs','scripts/audit-v12-native.mjs','scripts/audit-warehouse-open-water.mjs','scripts/check-aquarium.cjs']:
 try:b=subprocess.check_output(['git','show',candidate+':'+name],cwd=repo,stderr=subprocess.DEVNULL);(out/Path(name).name).write_bytes(b)
 except subprocess.CalledProcessError:pass
proof={'source':candidate,'allCapturedPublicModulesMatchSource':True,'moduleCount':len(manifest),'state':state,'scope':'Actual native game/private Worker/SQLite; SwiftShader correctness only, hardware FPS unmeasured','files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in out.iterdir()if p.is_file()}}
(out/'source-verification.json').write_text(json.dumps(proof,indent=2));print(candidate,len(manifest),state)
