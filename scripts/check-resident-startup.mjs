// Same original 68 rigs, warm A/B/B/A CPU setup. Browser RAF probes show UI
// responsiveness during loading, not physical-device gameplay/GPU FPS.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
import {prepareResidentModels} from './public/resident-preparation.js';
import {enableCatRenderBatch} from './public/cat-render-batch.js';
import {activeCats} from './public/cat-roster.js';import {newGame} from './public/economy.js';import {BIOMES} from './public/game-data.js';import {ADOPTION_CATS,catAppearance} from './public/cat-breeds.js';import {createCat,disposeCat} from './public/cat-model.js';
const game=newGame(1700000000000);game.unlocked=BIOMES.map(b=>b.id);game.adoption.cats=ADOPTION_CATS.slice(0,15).map(c=>({id:c.id,adoptedAt:1700000000000,homeBiome:'moon',centerId:''}));const profiles=activeCats(game).filter(p=>!p.homeVenueId);window.ready=true;
const tick=()=>new Promise(requestAnimationFrame);
window.audit=async()=>{const rows=[];let reference;
 for(const p of profiles){const m=createCat('happy',{detail:'npc',...catAppearance(p)});m.scale.setScalar(.63*(p.size||1));enableCatRenderBatch(m);disposeCat(m);}await tick();
 for(const cooperative of [false,true,true,false]){
  const models=[],gaps=[];let last=performance.now(),running=true;function heartbeat(at){if(!running)return;gaps.push(at-last);last=at;requestAnimationFrame(heartbeat);}requestAnimationFrame(heartbeat);await tick();const start=performance.now();let maxTask,work;
  if(cooperative){const pool=await prepareResidentModels(game);models.push(...profiles.map(p=>pool.take(p)));pool.dispose();maxTask=pool.stats.maxTaskMs;work=pool.stats.workMs;}
  else {for(const p of profiles){const m=createCat('happy',{detail:'npc',...catAppearance(p)});m.scale.setScalar(.63*(p.size||1));enableCatRenderBatch(m);models.push(m);}maxTask=work=performance.now()-start;}
  const elapsed=performance.now()-start;await tick();await tick();running=false;
  const signatures=models.map(m=>{const data=[];m.traverse(o=>{if(o.isMesh){for(const [name,a]of Object.entries(o.geometry.attributes))data.push(name,a.array.constructor.name,a.itemSize,...a.array);if(o.geometry.index)data.push('index',...o.geometry.index.array);}});return data;});
  if(!reference)reference=signatures;let equal=signatures.length===reference.length;for(let i=0;i<signatures.length&&equal;i++){const a=signatures[i],b=reference[i];equal=a.length===b.length;for(let k=0;k<a.length&&equal;k++)equal=Object.is(a[k],b[k]);}
  rows.push({cooperative,models:models.length,elapsedMs:elapsed,maxTaskMs:maxTask,workMs:work,rafCallbacks:gaps.length,maxUiGapMs:Math.max(...gaps),exactGeometry:equal});for(const m of models)disposeCat(m);
 }
 return rows;
};`},bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<script type="module" src="/app.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM,args:['--no-sandbox']});
try{const page=await browser.newPage();page.setDefaultTimeout(180000);await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);const rows=await page.evaluate(()=>audit());assert.ok(rows.every(r=>r.exactGeometry&&r.models>=60));assert.ok(Math.max(...rows.filter(r=>r.cooperative).map(r=>r.maxTaskMs))<Math.min(...rows.filter(r=>!r.cooperative).map(r=>r.maxTaskMs))/2);const dir=process.env.CHICHI_REVIEW_DIR||'/tmp/resident-startup';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'resident-startup.json'),JSON.stringify({browser:'Chromium, CPU-only preparation and UI RAF; not game/device FPS',order:'A/B/B/A',rows},null,2));console.log(rows);}finally{await browser.close();await new Promise(r=>server.close(r));}
