import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatTeleportationSystem } from '../public/cat-teleportation-system.js';

const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
const ticks=(system,count)=>{for(let i=0;i<count;i++)system.update(.1);};
function pool(capacity){
  const free=Array.from({length:capacity},(_,id)=>({id})),live=new Set();
  let acquired=0,released=0,peak=0;
  return{live,get stats(){return{acquired,released,peak,free:free.length};},
    acquire(){const effect=free.pop();if(!effect)return null;live.add(effect);acquired++;peak=Math.max(peak,live.size);return effect;},
    release(effect){if(!effect)return;assert(live.delete(effect),'every acquired effect is released exactly once');free.push(effect);released++;},
    update(effect){assert(live.has(effect),'animation owns an active pooled effect');},
    dispose(){assert.equal(live.size,0,'system disposal returns every visual slot');},
  };
}

test('129 queued cats query native arrivals only on a free visual slot and at commit',async()=>{
  const actors=Array.from({length:129},(_,i)=>({id:'cat'+i,position:{x:-1000-i*4,y:.16,z:0},radius:.6})),
    slots=actors.map((_,i)=>({x:1000+i*4,y:.16,z:0})),effects=pool(12);
  let arrivalQueries=0,arrivals=0;
  const system=createCatTeleportationSystem({getActors:()=>actors,effects,maxConcurrent:384});
  system.register({destinationId:'actual-group-room',arrivalPoints(){arrivalQueries++;assert(effects.live.size>0);return slots;},checkArrival:p=>p.y===.16});
  const operations=actors.map(a=>system.request(a.id,'actual-group-room',{onArrival:()=>{arrivals++;return true;}}));
  assert(operations.every(Boolean));await flush();system.update(.1);
  assert.equal(arrivalQueries,12,'queued cats do not build candidate lists while all visual slots are full');
  assert.equal(effects.live.size,12);
  const waiting=[...system.operations.values()].filter(op=>!op.started);
  assert.equal(waiting.length,117);
  assert(waiting.every(op=>op.arrival===null&&!op.effect),'unopened cats hold no phantom arrival reservations');
  ticks(system,2);assert.equal(arrivalQueries,12,'ordinary queued frames do not repeat the expensive native search');
  system.update(.1);assert.equal(arrivalQueries,24,'each active cat revalidates its real surface once at coordinate commit');
  ticks(system,156);
  assert.equal(arrivalQueries,129*2,'one opening search and one commit search per completed cat');
  assert.equal(arrivals,129);assert.equal(system.diagnostics.active,0);
  assert.deepEqual(effects.stats,{acquired:129,released:129,peak:12,free:12});
  for(const op of operations)assert.equal(await op.result,true);
  for(let i=0;i<actors.length;i++)for(let j=0;j<i;j++){
    const a=actors[i],b=actors[j];assert(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)>=a.radius+b.radius+.2);
  }
  system.dispose();
});

test('an unavailable native arrival releases its effect immediately so another cat can start in the same update',async()=>{
  const actors=[{id:'blocked',position:{x:0,y:.16,z:0}},{id:'free',position:{x:5,y:.16,z:0}}],effects=pool(1),errors=[];
  const system=createCatTeleportationSystem({getActors:()=>actors,effects,onError:(message,id)=>errors.push(id)});
  system.register({destinationId:'blocked-surface',arrivalPoints:()=>[]});
  system.register({destinationId:'free-surface',arrivalPoint:{x:100,y:.16,z:0}});
  const blocked=system.request('blocked','blocked-surface'),free=system.request('free','free-surface');await flush();system.update(.1);
  assert.equal(blocked.phase,'WaitingForArrivalSlot');assert.equal(blocked.arrival,null);assert.equal(blocked.effect,null);
  assert.equal(free.started,true,'the blocked physical destination did not retain the sole visual slot');
  assert.equal(effects.live.size,1);ticks(system,160);
  assert.equal(await blocked.result,false);assert.equal(await free.result,true);
  assert.deepEqual(errors,['blocked']);assert.deepEqual(actors[0].position,{x:0,y:.16,z:0});
  assert.equal(effects.live.size,0);assert.equal(effects.stats.free,1);assert.equal(effects.stats.acquired,effects.stats.released);
  system.dispose();
});

test('cancellation and a rejected native handoff return pooled effects without starting stale arrivals',async()=>{
  const actors=[{id:'reject',position:{x:0,y:.16,z:0}},{id:'cancel',position:{x:5,y:.16,z:0}}],effects=pool(1);
  let arrivals=0;
  const system=createCatTeleportationSystem({getActors:()=>actors,effects,onBegin:id=>id!=='reject'});
  system.register({destinationId:'native-floor',arrivalPoints:()=>[{x:100,y:.16,z:0},{x:105,y:.16,z:0}]});
  const rejected=system.request('reject','native-floor'),cancelled=system.request('cancel','native-floor',{onArrival:()=>{arrivals++;}});
  await flush();system.update(.1);
  assert.equal(await rejected.result,false);assert.equal(cancelled.started,true);
  assert.equal(system.cancel('cancel'),true);assert.equal(await cancelled.result,false);ticks(system,8);
  assert.equal(arrivals,0);assert.equal(system.diagnostics.active,0);
  assert.deepEqual(effects.stats,{acquired:2,released:2,peak:1,free:1});
  assert.deepEqual(actors[1].position,{x:5,y:.16,z:0});system.dispose();
});
