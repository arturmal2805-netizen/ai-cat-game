import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {waterfrontProtected} from './warehouse-access-protected.mjs';
export async function auditRelease(args){
 const {page,review,errors,httpErrors,desktop}=args;
 await waterfrontProtected(args);
 const before=JSON.parse(await readFile('/workspace/qa/waterfront-v14-baseline-time7/protected-buildings.json')),now=JSON.parse(await readFile(join(review,'protected-buildings.json')));
 if(desktop)for(const name of ['mall','spa'])assert.deepEqual(now.buildings[name],before.buildings[name],name+' retains every original geometry/material/pose');
 for(const k of ['lights','dpr','toneMapping','shadowType'])assert.deepEqual(now[k],before[k],k);
 await page.evaluate(async()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=false;q.drawPaused=true;await q.warehouse().ensure();q.manualFrames=true;q.oceanReviewCamera=null;q.testNow=performance.now();});
 const step=(count=1)=>page.evaluate(count=>{const q=__lagoonQA;for(let i=0;i<count;i++){q.testNow+=100;q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}}return q.warehouse().diagnostics();},count);
 const activate=s=>desktop?page.locator(s).click():page.locator(s).tap();
 const shot=async(name,{eye,target,fov=65}={})=>{await page.evaluate(({eye,target,fov})=>{const q=__lagoonQA,T=q.THREE,island=q.islands.get('autumn');if(eye){q.oceanReviewCamera={eye:[island.position.x+eye[0],eye[1],island.position.z+eye[2]],target:[island.position.x+target[0],target[1],island.position.z+target[2]],fov,far:20000};q.testNow+=1;q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}}q.drawFrame();q.renderer.getContext().finish();},{eye,target,fov});await page.screenshot({path:join(review,name+'.png')});};
 await activate('.warehouse-access');await step(30);assert(await page.locator('.warehouse-panel').isVisible());await shot('warehouse-wide-product');
 const initial=await page.evaluate(()=>{const s=__lagoonSaveQA,g=s.getGame();return{coins:g.coins,diamonds:g.diamonds,inventory:g.inventory,placements:g.placements,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins]))};});
 await activate('[data-warehouse-call]');await step(1);assert(await page.evaluate(()=>__lagoonQA.warehouse().has('chichi')),'real recall button starts same native actor');
 // Request ownership while still heading for the boat, through the real toolbar.
 await activate('#chichi-control');assert(await page.evaluate(()=>__lagoonQA.warehouse().runtime.get('chichi').manualWanted));
 const phases=[],captured=new Set();let manual=false;
 for(let i=0;i<600;i++){
  const state=await step(8),v=state.visits.find(v=>v.id==='chichi');assert(v,'visit retained until manual arrival');if(!phases.includes(v.phase)){phases.push(v.phase);console.log('WAREHOUSE_CHICHI_PHASE',v.phase);}
  assert(state.boats.filter(b=>b.id).length<=3);assert(v.position.every(Number.isFinite));
  if(!captured.has(v.phase)&&['boarding','outbound','leaving-boat','airlock-in','visit'].includes(v.phase)){
   const camera=await page.evaluate(()=>{const q=__lagoonQA,island=q.islands.get('autumn'),p=q.chichiCarrier.position;return{eye:[p.x-island.position.x+10,p.y+6,p.z-island.position.z+14],target:[p.x-island.position.x,p.y+2,p.z-island.position.z]};});
   await shot('chichi-'+v.phase,camera);captured.add(v.phase);
  }
  if(state.manual==='chichi'){manual=true;break;}
 }
 assert(manual,'toolbar takeover survives approach/boarding/flight/airlock');assert(await page.evaluate(()=>__lagoonQA.manualWalk().active));
 await page.evaluate(()=>{const q=__lagoonQA;q.oceanReviewCamera=null;});await step(4);
 const start=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray());
 let cdp=null;
 if(desktop)await page.keyboard.down('KeyW');else{cdp=await page.context().newCDPSession(page);const r=await page.locator('[data-walk-key="KeyW"]').boundingBox();assert(r&&r.width>=44&&r.height>=44&&r.y>=0&&r.y+r.height<=844);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:3}]});}
 await step(12);
 if(desktop)await page.keyboard.up('KeyW');else await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const walked=await page.evaluate(()=>{const q=__lagoonQA,p=q.chichiCarrier.position;return{p:p.toArray(),supported:q.manualSurface(p,q.catRadius()),manual:q.warehouse().manual};});assert(walked.manual&&walked.supported);assert(Math.hypot(walked.p[0]-start[0],walked.p[2]-start[2])>3,'actual held keyboard/touch moves Chichi on Warehouse floor');
 await shot('warehouse-native-third-person-walking');
 await page.evaluate(()=>{const q=__lagoonQA;q.manualWalk().stop();q.warehouse().runtime.cancel('chichi');});
 const returns=[];
 for(let i=0;i<1000;i++){const state=await step(8),v=state.visits.find(v=>v.id==='chichi');if(!v)break;if(!returns.includes(v.phase)){returns.push(v.phase);console.log('WAREHOUSE_RETURN_PHASE',v.phase);}if(i===999)assert.fail('return never completes');}
 assert(returns.includes('airlock-out')&&returns.includes('inbound')&&returns.includes('disembark'));
 // A native resident uses the same real fleet and entry, via a catalogue activity.
 const resident=await page.evaluate(()=>{const q=__lagoonQA,id=[...q.npcs.keys()].find(id=>!q.warehouse().has(id));q.jobs.cancel(id);q.housingLife.cancel?.(id);q.residentPlay.cancel(id);q.spa.cancel(id);q.chill.cancel(id);q.court.cancel(id);q.npcs.get(id).leisureBiome='autumn';return q.warehouse().startReady(id,'warehouse-rest',null)?id:null;});assert(resident);
 const residentPhases=[];
 for(let i=0;i<1300;i++){const state=await step(8),v=state.visits.find(v=>v.id===resident);if(!v)break;if(!residentPhases.includes(v.phase))residentPhases.push(v.phase);if(i===1299)assert.fail('resident round trip never completes');}
 for(const phase of ['outbound','airlock-in','visit','airlock-out','inbound'])assert(residentPhases.includes(phase),phase);
 await shot('working-entrance-and-dock',{eye:[3520,-438,950],target:[3520,-449,895],fov:desktop?65:95});
 const saved=await page.evaluate(async()=>{const s=__lagoonSaveQA;s.commit({...s.getGame()},false);await s.cloud.flush();const g=s.getGame();return{coins:g.coins,diamonds:g.diamonds,inventory:g.inventory,placements:g.placements,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins]))};});assert.deepEqual(saved,initial,'free trips retain player/cat coins, diamonds, inventory and purchases');
 await cdp?.detach();if(!desktop){const{warehouseSaveRestore}=await import('./warehouse-access-save.mjs');await warehouseSaveRestore(args,initial);}assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 await writeFile(join(review,'warehouse-access-native.json'),JSON.stringify({passed:true,desktop,phases,returns,resident,residentPhases,start,walked,initial,saved,errors,httpErrors,privateSQLite:true,paidInferenceCalled:false},null,2));
 console.log('WAREHOUSE_ACCESS_NATIVE_PASS');
}
