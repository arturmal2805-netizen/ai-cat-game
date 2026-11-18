import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {byBiome} from '../public/game-data.js';
import {resortSpaOrigin} from '../public/resort-spa-data.js';
import {RESORT_LIFT as L} from '../public/resort-spa-lift.js';
export async function auditResortTransit({page,review}){
 const centre=resortSpaOrigin(byBiome('autumn').center);
 await page.evaluate(async({centre,L})=>{if(!await __lagoonSaveQA.cloud.claimEditor())throw Error('No private owner');const q=__lagoonQA;q.manualFrames=true;q.jobs.cancel('chichi');q.chichiCarrier.position.set(centre[0],L.upperY,centre[1]+309);if(!q.resortSpa().startReady('chichi','resort-massage'))throw Error('Upper landing appointment failed to start');},{centre,L});
 const before=await page.evaluate(()=>({coins:__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins,worldCoins:__lagoonSaveQA.getGame().coins})),trace=[],captured=new Set();let complete=false,waiting=0;
 for(let batch=0;batch<400;batch++){
  const result=await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<20;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}}const r=q.resortSpa(),v=r.appointments.runtime.get('chichi'),t=r.transit.trips.get('chichi');return{active:r.has('chichi'),phase:v?.phase||t?.phase,stage:v?'appointment':'lift',lift:{...r.transit.lift.state},position:q.chichiCarrier.position.toArray(),paid:__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins};});
  if(trace.at(-1)?.phase!==result.phase||trace.at(-1)?.stage!==result.stage||trace.at(-1)?.lift.phase!==result.lift.phase){trace.push(result);console.log('Native SPA route',result.stage,result.phase,result.lift.phase,result.position);}
  waiting=result.phase==='waiting'&&result.stage==='appointment'?waiting+1:0;
  if(waiting>5){await writeFile(join(review,'failed-route-trace.json'),JSON.stringify(trace,null,2));assert.fail('An empty native massage cabin remains unreachable after ten seconds');}
  const view=result.lift.phase==='travelling'?'lift-trip':result.stage==='appointment'&&result.phase==='procedure'?'massage-after-trip':null;
  if(view&&!captured.has(view)){captured.add(view);await page.evaluate(()=>{const q=__lagoonQA,p=q.chichiCarrier.position;q.reviewView(p.x,p.z,16);q.desiredLook.y=p.y+1;q.reviewOrbit(-.65,.3);q.drawPaused=false;q.gpuFrames.clear();q.appointmentClock+=100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;q.drawPaused=true;}});await page.screenshot({path:join(review,'actual-native-'+view+'.png')});}
  if(!result.active){complete=true;break;}
 }
 assert(complete,'native upper-landing→lift→massage→lift→upper return must complete');
 const after=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),p=g.jobCity.profiles.chichi;return{coins:p.coins,worldCoins:g.coins,used:p.mall.used,position:__lagoonQA.chichiCarrier.position.toArray()};});
 assert.equal(after.coins,before.coins-300);assert.equal(after.worldCoins,before.worldCoins);assert.equal(after.used['resort-massage-session'],1);assert(Math.abs(after.position[1]-L.upperY)<.05);assert(trace.some(v=>v.stage==='appointment'&&v.phase==='procedure'));
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry,null,{timeout:120000});
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;});
 const reloaded=await page.evaluate(()=>({coins:__lagoonSaveQA.getGame().jobCity.profiles.chichi.coins,position:__lagoonQA.chichiCarrier.position.toArray()}));assert.equal(reloaded.coins,after.coins);assert(Math.abs(reloaded.position[1]-L.upperY)<.65);
 await writeFile(join(review,'actual-landing-lift-massage-return.json'),JSON.stringify({scope:'Private upper-apron starting fixture; actual world actor, full lift/corridor/massage/return and SQLite. Does not prove shore approach, submarine airlock, other procedures or visual acceptance.',before,after,reloaded,trace},null,2));console.log('PASS native upper landing/lift/massage/physical return/SQLite');
}
