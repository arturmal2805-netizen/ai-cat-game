import {auditExplorerPhoneNative} from './audit-explorer-phone-native.mjs';
import {auditExplorerTouchNative} from './audit-explorer-touch-native.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {auditExplorerInputNative} from './audit-explorer-input-native.mjs';

export async function auditOceanExplorerNative({page,review,errors,httpErrors,capture}){
 const snapshot=()=>page.evaluate(()=>{const q=__lagoonQA,s=q.submarine(),g=__lagoonSaveQA.getGame();return {phase:s.phase,controlled:s.controlled,explorer:s.snapshot().explorer,view:s.view,visible:q.chichiCarrier.visible&&q.cat.visible,actor:q.chichiCarrier.position.toArray(),boat:s.snapshot(),camera:q.camera.position.toArray(),fov:q.camera.fov,near:q.camera.near,coins:g.coins,inventory:g.inventory,placements:g.placements};});
 const advance=(n,dt=.1)=>page.evaluate(async({n,dt})=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.submarine().update(dt,performance.now()/1000+i*dt);q.submarine().updateCamera(dt);if(i%20===0)await new Promise(resolve=>setTimeout(resolve,0));}},{n,dt});
 const move=async(code,n)=>{await page.keyboard.down(code);await advance(n);await page.keyboard.up(code);};
 const routeTrace=[];
 const turnView=async yaw=>{
  for(let i=0;i<10;i++){
   const current=(await snapshot()).view.orbitYaw,delta=Math.atan2(Math.sin(yaw-current),Math.cos(yaw-current));if(Math.abs(delta)<.01)break;
   const point=await page.evaluate(()=>{const canvas=__lagoonQA.renderer.domElement,b=canvas.getBoundingClientRect();for(const y of [.4,.3,.55,.2,.65])for(const x of [.5,.35,.65]){const p={x:b.x+b.width*x,y:b.y+b.height*y};if(document.elementFromPoint(p.x,p.y)===canvas)return p;}throw Error('No unobstructed native canvas point for orbit');});
   const dx=Math.max(-125,Math.min(125,-delta/.004));await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+dx,point.y);await page.mouse.up();
  }
  await advance(8);
 };
 const walkTo=async target=>{
  const path=await page.evaluate(async target=>{const q=__lagoonQA,s=q.submarine().explorer,actors=q.mall().walkActors().filter(a=>a.id!=='chichi'&&Math.abs(a.y-s.y)<2);return q.mall().walkPath(s.floor,s,target,q.catRadius());},target);assert.ok(path?.length,'actual navigation must provide a physical approach route');
  await page.evaluate(()=>{__lagoonQA.manualFrames=true;});
  try{for(const waypoint of path.slice(1)){
   let reached=false;for(let i=0;i<100;i++){
    const s=(await snapshot()).explorer,dist=Math.hypot(waypoint.x-s.x,waypoint.z-s.z);if(dist<.24){reached=true;break;}
    await turnView(Math.atan2(waypoint.x-s.x,waypoint.z-s.z));await page.keyboard.down('KeyW');await advance(Math.max(1,Math.min(4,Math.floor(dist/.25))),Math.min(.05,dist/5));await page.keyboard.up('KeyW');routeTrace.push((await snapshot()).explorer);
   }assert.ok(reached,'body must reach each waypoint without crossing walls');
  }}finally{await page.keyboard.up('KeyW');await page.evaluate(()=>{__lagoonQA.manualFrames=false;});}
 };
 const persist=async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);};
 const reload=async(prepare=true)=>{await persist();await page.reload();await page.waitForFunction(()=>window.__lagoonQA?.submarine()&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});await page.evaluate(async prepare=>{__lagoonQA.drawPaused=true;if(prepare)await __lagoonQA.mall().ensure();},prepare);};
 const watcher=setInterval(async()=>{try{console.log('Explorer progress',await page.evaluate(()=>{const q=__lagoonQA,s=q.submarine();return {phase:s.phase,controlled:s.controlled,explorer:s.explorer,root:!!q.mall().root,ready:q.mall().ready,visible:q.isVisible(),paused:q.drawPaused,exitHidden:document.querySelector('[data-sub-exit]').hidden,mallHidden:document.querySelector('[data-sub-mall]').hidden};}));}catch{}},15000);
 try{
 console.log('Explorer: initial boat');
 await page.evaluate(async()=>{__lagoonQA.drawPaused=true;await __lagoonQA.mall().ensure();});
 const inputChecks=[];const initial=await snapshot();assert.equal(initial.phase,'piloting');let first=null;
 if(process.env.CHICHI_EXPLORER_STAGE!=='mall'){
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');
 inputChecks.push(await auditExplorerInputNative({page,advance,snapshot,label:'swimming'}));inputChecks.push(await auditExplorerTouchNative({page,advance,snapshot,label:'swimming'}));inputChecks.push(await auditExplorerPhoneNative({page,advance,snapshot,label:'swimming'}));
 if(process.env.CHICHI_EXPLORER_STAGE==='swim-only'){await capture('hidden-swim-controls');await writeFile(join(review,'swim-controls.json'),JSON.stringify({completed:true,inputChecks,errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;}
 first=await snapshot();assert.ok(first.explorer.y< -10);assert.equal(first.visible,true);assert.ok(Math.hypot(...first.camera.map((v,i)=>v-first.actor[i]))>1.2);await capture('chichi-swimming-third-person');
 const position=await snapshot();await move('ArrowDown',5);assert.ok((await snapshot()).explorer.y<position.explorer.y-2);await move('Space',5);
 await move('KeyW',3);await move('KeyS',3);
 await page.keyboard.press('KeyE');await advance(31);assert.equal((await snapshot()).phase,'piloting');
 await page.keyboard.press('KeyE');await reload();assert.equal((await snapshot()).phase,'swimming');
 console.log('Explorer: swim reload passed');
 await page.locator('#camera-all').click();assert.equal((await snapshot()).controlled,false);
 assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);
 await advance(2200);assert.equal((await snapshot()).phase,'docked');assert.equal((await snapshot()).controlled,false);
 if(process.env.CHICHI_DESKTOP)await page.locator('[data-biome="autumn"]').click();else await page.locator('[data-biome="autumn"]').tap();
 await page.keyboard.press('KeyE');await advance(31);
 assert.equal((await snapshot()).phase,'piloting');
 }
 console.log('Explorer: preparing Mall approach');
 await page.evaluate(()=>{const q=__lagoonQA;Object.assign(q.submarine().physics.state,{x:-43,y:-162.5,z:124.5,yaw:Math.PI,speed:0,vertical:0,pitch:0});q.submarine().update(0,performance.now()/1000);});
 await page.keyboard.press('KeyE');
 console.log('Explorer: portal approach',await page.evaluate(()=>({phase:__lagoonQA.submarine().phase,explorer:__lagoonQA.submarine().explorer})));
 await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming',null,{timeout:30000});
 await page.evaluate(async()=>{await Promise.race([__lagoonQA.mall().ensure(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Mall preparation timed out')),180000))]);});
 console.log('Explorer: Mall ready, portal visible',await page.locator('[data-sub-mall]').isVisible());
 await page.keyboard.press('KeyE');
 await advance(150);assert.equal((await snapshot()).phase,'mall');assert.equal((await snapshot()).explorer.floor,1);await capture('chichi-third-person-mall');
 console.log('Explorer: sequential airlock entry passed');
 inputChecks.push(await auditExplorerInputNative({page,advance,snapshot,label:'mall'}));inputChecks.push(await auditExplorerTouchNative({page,advance,snapshot,label:'mall'}));inputChecks.push(await auditExplorerPhoneNative({page,advance,snapshot,label:'mall'}));
 const inside=await snapshot();await move('KeyW',5);assert.ok((await snapshot()).explorer.z<inside.explorer.z-1);await move('KeyS',5);
 // Leave through the same real chamber, reboard the waiting hull, and enter again.
 await page.keyboard.press('KeyE');await advance(150);assert.equal((await snapshot()).phase,'swimming');await capture('chichi-airlock-exit-third-person');await turnView(0);await page.keyboard.press('KeyE');await advance(31);assert.equal((await snapshot()).phase,'piloting');await page.keyboard.press('KeyE');await turnView(Math.PI);await page.keyboard.press('KeyE');await advance(150);assert.equal((await snapshot()).phase,'mall');
 await reload();assert.equal((await snapshot()).phase,'mall');assert.equal((await snapshot()).explorer.floor,1);
 await page.evaluate(async()=>{await Promise.race([__lagoonQA.mall().ensure(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Mall preparation timed out')),180000))]);});
 // Walk from the airlock to the actual escalator foot; no avatar relocation.
 await walkTo({x:18.4,y:-164.82,z:51.4});await turnView(0);
 await move('KeyW',60);assert.equal((await snapshot()).explorer.floor,2);await capture('chichi-escalator-floor2');
 await reload(false);assert.equal((await snapshot()).explorer.floor,2);
 const cold=await page.evaluate(()=>({root:!!__lagoonQA.mall().root,ready:__lagoonQA.mall().ready,paused:__lagoonQA.drawPaused}));console.log('Cold Mall return initial',cold);
 await page.locator('#camera-island').click();assert.equal((await snapshot()).controlled,false);assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);
 for(let i=0;i<180&&(await snapshot()).phase!=='docked';i++){await advance(100);await page.waitForTimeout(100);}
 console.log('Explorer return state',await page.evaluate(()=>({phase:__lagoonQA.submarine().phase,position:__lagoonQA.submarine().explorer})));
 assert.equal((await snapshot()).phase,'docked','manual Mall control must return Chichi to ordinary life');
 await reload(false);assert.equal((await snapshot()).phase,'docked');assert.equal((await snapshot()).controlled,false);assert.equal((await snapshot()).explorer,null);console.log('Explorer: final dock reload passed');
 const final=await snapshot();assert.equal(final.coins,initial.coins);assert.deepEqual(final.inventory,initial.inventory);assert.deepEqual(final.placements,initial.placements);
 // The fixture's one-hour manual hold must be released through the same durable
 // commit/world sync as real profile changes, rather than mutating an app-only
 // object after the world has synchronized a newer save snapshot.
 await page.evaluate(()=>{const g=structuredClone(__lagoonSaveQA.getGame()),p=g.jobCity.profiles.chichi;g.jobCity.epoch=Date.now();p.schedule={...p.schedule,day:0,job:p.profession};p.manualUntil=0;__lagoonSaveQA.commit(g);__lagoonQA.drawPaused=false;});
 try{await page.waitForFunction(()=>!!__lagoonQA.jobs.get('chichi'),null,{timeout:30000});}catch(error){const state=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();return{phase:q.submarine().phase,active:q.submarine().active,profile:g.jobCity.profiles.chichi,epoch:g.jobCity.epoch,unlocked:g.unlocked,mallHas:q.mall().has('chichi'),operation:q.getOperation()?.stage,care:g.care,paused:q.drawPaused,visibility:document.visibilityState};});await writeFile(join(review,'autonomy-blocker.json'),JSON.stringify(state,null,2));throw error;}
 const autonomous=await page.evaluate(()=>({phase:__lagoonQA.jobs.get('chichi').phase,job:__lagoonQA.jobs.get('chichi').job,position:__lagoonQA.chichiCarrier.position.toArray()}));assert.ok(autonomous.job&&autonomous.job!=='rest');
 await reload(false);assert.equal((await snapshot()).phase,'docked');assert.equal((await snapshot()).controlled,false);
 try{await page.waitForFunction(()=>!!__lagoonQA.jobs.get('chichi'),null,{timeout:30000});}catch(error){const state=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();return{phase:q.submarine().phase,active:q.submarine().active,profile:g.jobCity.profiles.chichi,epoch:g.jobCity.epoch,unlocked:g.unlocked,mallHas:q.mall().has('chichi'),operation:q.getOperation()?.stage,care:g.care,paused:q.drawPaused,visibility:document.visibilityState};});await writeFile(join(review,'autonomy-blocker.json'),JSON.stringify(state,null,2));throw error;}console.log('Explorer: autonomous ordinary work resumes before and after SQLite reload',autonomous);
 await writeFile(join(review,'explorer-results.json'),JSON.stringify({stage:process.env.CHICHI_EXPLORER_STAGE||'full',initial,first,inside,cold,final,inputChecks,routeTrace,autonomous,errors,httpErrors,renderer:'Native game, Chromium SwiftShader at DPR2; not device FPS'},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log(process.env.CHICHI_EXPLORER_STAGE==='mall'?'PASS: sequential Mall airlock, walking, storey reloads, escalator, camera release and automatic return.':'PASS: underwater exit, third-person movement/dive, reboard, world/island release, swimming/Mall reload, sequential airlock, escalator and automatic return.');
 }finally{clearInterval(watcher);}
}
