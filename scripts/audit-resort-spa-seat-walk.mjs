import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {resortSpaOrigin,resortZone,resortSpaSeat} from '../public/resort-spa-data.js';
import {byBiome} from '../public/game-data.js';

export async function auditResortSeatWalk({page,review}){
 const centre=resortSpaOrigin(byBiome('autumn').center),seat=resortSpaSeat(resortZone('resort-nap'),6);
 await page.evaluate(async({centre,seat})=>{await __lagoonSaveQA.cloud.claimEditor();const q=__lagoonQA;q.drawPaused=true;q.manualFrames=true;q.jobs.cancel('chichi');q.resortSpa().cancel('chichi');q.chichiCarrier.position.set(centre[0]+seat.x,seat.y+.92,centre[1]+seat.z);q.chichiCarrier.rotation.set(0,0,0);},{centre,seat});
 await page.locator('#chichi-control').click();
 await page.waitForFunction(()=>__lagoonQA.manualWalk().active,null,{timeout:10000});
 const before=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray());
 await page.keyboard.down('w');
 try{await page.evaluate(()=>{const q=__lagoonQA;q.seatWalkLevels=[];for(let i=0;i<12;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}q.seatWalkLevels.push(q.chichiCarrier.position.y);}});}finally{await page.keyboard.up('w');}
 const result=await page.evaluate(()=>{const q=__lagoonQA;return{after:q.chichiCarrier.position.toArray(),levels:q.seatWalkLevels,radius:q.catRadius(),submarineControlled:q.submarine().controlled,inspection:q.resortSpa().inspection,input:q.manualWalk().inputState};});
 assert(Math.hypot(result.after[0]-before[0],result.after[2]-before[2])>3);assert(Math.abs(result.after[1]-(seat.y-.0))<.04);assert(result.levels.some(y=>Math.abs(y-(seat.y+.46))<.04));assert.equal(result.submarineControlled,false);assert.equal(result.inspection,false);assert.deepEqual(result.input.keys,[]);
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=false;q.gpuFrames.clear();q.appointmentClock+=100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;q.drawPaused=true;}});
 await page.screenshot({path:join(review,'actual-manual-seat-exit.png')});
 await page.locator('#camera-all').click();assert.equal(await page.evaluate(()=>__lagoonQA.manualWalk().active),false);
 await writeFile(join(review,'actual-manual-seat-exit.json'),JSON.stringify({before,...result,worldReleased:true,scope:'Actual W held on native third-person Chichi from Nap seat6, physical footstool and floor. Private fixture; not a full autonomous shore tour.'},null,2));
 console.log('PASS actual keyboard W from Nap seat6 via real footstool, no submarine takeover and World release');
 await page.evaluate(()=>__lagoonQA.resortSpa().inspect());
}
