import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditSpaInvitation({page,review}){
 await page.evaluate(async()=>{if(!await __lagoonSaveQA.cloud.claimEditor())throw Error('No private editor');const q=__lagoonQA;q.manualFrames=true;q.drawPaused=true;q.jobs.cancel('chichi');});
 const read=()=>page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame(),p=g.jobCity.profiles.chichi;return{position:q.chichiCarrier.position.toArray(),coins:p.coins,worldCoins:g.coins,inventory:g.inventory,receipts:p.mall?.receipts||{},used:p.mall?.used||{},schedule:p.schedule,clock:q.gameClock(),frame:q.resortSpa().frame('chichi'),manual:q.manualWalk().active};});
 const before=await read();await page.locator('.resort-spa-call').click();
 const phases=new Set();let arrived=false,maxStep=0,prior=before.position;
 for(let batch=0;batch<600;batch++){
  const result=await page.evaluate(()=>{const q=__lagoonQA;let maxStep=0;for(let i=0;i<10;i++){const prior=q.chichiCarrier.position.clone();q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}maxStep=Math.max(maxStep,q.chichiCarrier.position.distanceTo(prior));}const f=q.resortSpa().frame('chichi');return{frame:f?{phase:f.phase,transport:f.transport}:null,position:q.chichiCarrier.position.toArray(),disabled:document.querySelector('.resort-spa-call').disabled,maxStep};});
  maxStep=Math.max(maxStep,result.maxStep);prior=result.position;if(result.frame?.phase&&!phases.has(result.frame.phase)){phases.add(result.frame.phase);console.log('SPA invitation actual phase',result.frame.phase);}
  if(result.position[1]<-160&&!result.frame&&!result.disabled){arrived=true;break;}
 }
 const after=await read();await writeFile(join(review,'v8-invitation.json'),JSON.stringify({before,after,arrived,phases:[...phases],maxStep,scope:'Private native original Chichi; existing magical recall between locations, then full physical shore walk/pressure lift/SPA entry. No procedure purchase or paid AI.'},null,2));
 assert(arrived,'call must reach the actual dry SPA entrance');assert(phases.has('riding')&&phases.has('walk'),'physical lift and walked approach');assert(!after.manual);for(const field of ['coins','worldCoins','inventory','receipts','used'])assert.deepEqual(after[field],before[field],'free invitation preserves '+field);
 // A second call in the SPA is a no-op, without a second journey or a debit.
 await page.locator('.resort-spa-call').click();const repeated=await read();assert.equal(repeated.frame,null);assert.deepEqual(repeated.position,after.position);assert.equal(repeated.coins,before.coins);
 console.log('PASS SPA free invitation, real lift/entrance, repeat and unchanged balances/receipts');
}
