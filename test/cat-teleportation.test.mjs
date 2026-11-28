import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import{createCatTeleportationSystem}from'../public/cat-teleportation-system.js';
import{createCatPortalVisuals}from'../public/cat-portal-visuals.js';
const tick=(s,n=8)=>{for(let i=0;i<n;i++)s.update(.1);};
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
test('instant transfer uses real points, supports negative floors, keeps safe snapshots and starts one activity',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0),radius:.6,carrier:new T.Group()},calls=[];
 const s=createCatTeleportationSystem({getActors:()=>[a],onBegin:id=>calls.push(id)});s.register({destinationId:'real-zone',arrivalPoint:{x:500,y:-450,z:100},checkArrival:p=>p.y===-450});
 let arrived=0;const op=s.request(a.id,'real-zone',{onArrival:()=>{arrived++;return true;}});await flush();s.update(.1);assert.equal(s.safePosition(a.id).y,.16);tick(s,4);assert.equal(s.safePosition(a.id).y,-450);assert(a.position.y>-450);tick(s);assert(await op.result);assert.equal(arrived,1);assert.deepEqual(a.position.toArray(),[500,-450,100]);assert.equal(calls.length,1);assert(!s.has(a.id));
});
test('latest command wins across asynchronous preparation, cancellation and valid reload projection',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0),radius:.6},s=createCatTeleportationSystem({getActors:()=>[a]});let resolve;
 s.register({destinationId:'slow',prepare:()=>new Promise(r=>resolve=r),arrivalPoint:{x:99,y:0,z:0}});s.register({destinationId:'new',arrivalPoint:{x:5,y:.16,z:0}});
 const old=s.request('chichi','slow');await flush();const next=s.request('chichi','new');resolve(true);await flush();tick(s);assert.equal(await old.result,false);assert.equal(await next.result,true);assert.equal(a.position.x,5);
 const cancel=s.request('chichi','slow');await flush();s.cancel('chichi');resolve?.(true);await flush();tick(s);assert.equal(await cancel.result,false);assert.equal(a.position.x,5);
});
test('group reservations and actual surface revalidation prevent overlaps and invalid arrivals',async()=>{
 const actors=Array.from({length:5},(_,i)=>({id:'cat'+i,position:new T.Vector3(i*4,.16,0),radius:.6}));let floor=-120;
 const s=createCatTeleportationSystem({getActors:()=>actors});s.register({destinationId:'spa-room',arrivalPoints:()=>Array.from({length:5},(_,i)=>({x:100+i*3,y:floor,z:0})),checkArrival:p=>p.y===floor});
 const ops=actors.map(a=>s.request(a.id,'spa-room'));await flush();s.update(.1);assert.equal(new Set([...s.operations.values()].map(o=>o.arrival.x)).size,5);
 floor=-121;tick(s);for(const op of ops)assert(await op.result);assert(actors.every(a=>a.position.y===floor));assert.equal(new Set(actors.map(a=>a.position.x)).size,5);
});
test('unsafe actor waits without moving; cancellation and disposal preserve visibility and release effects',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0),radius:.6,carrier:new T.Group()};let safe=false,acquired=0,released=0;
 const s=createCatTeleportationSystem({getActors:()=>[a],canTravel:()=>safe,effects:{acquire(){acquired++;return{};},update(){},release(v){if(v)released++;},dispose(){}}});s.register({destinationId:'net',arrivalPoint:{x:20,y:3,z:0}});
 const op=s.request(a.id,'net');await flush();tick(s,30);assert.equal(a.position.x,0);assert.equal(acquired,0);safe=true;tick(s,5);assert.equal(s.safePosition(a.id).y,3);s.dispose();assert.equal(await op.result,false);assert.equal(a.position.y,3);assert(a.carrier.visible);assert.equal(released,1);
});
test('portal pool has bounded shared buffers and no lights or per-frame particle uploads',()=>{
 const scene=new T.Scene(),p=createCatPortalVisuals(scene,{capacity:2}),a=p.acquire('warehouse',.6),b=p.acquire('spa',.6);assert(a&&b);assert.equal(p.acquire('mall',.6),null);
 const buffers=[];scene.traverse(o=>{assert(!o.isLight);if(o.isPoints)buffers.push(o.geometry.attributes.position);});const versions=buffers.map(b=>b.version);
 for(let i=0;i<50;i++)p.update(a,{age:i/100,from:{x:0,y:0,z:0},to:{x:5,y:0,z:0},relocated:i>40});assert.deepEqual(buffers.map(b=>b.version),versions);p.release(a);assert(p.acquire('mall',.6));p.dispose();assert.equal(scene.children.length,0);
});
test('a command superseded before the microtask never starts its cold preparation',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0)},s=createCatTeleportationSystem({getActors:()=>[a]});let prepared=0;
 s.register({destinationId:'cold-placement',prepare:()=>{prepared++;},arrivalPoint:{x:20,y:.16,z:0}});
 s.register({destinationId:'current',arrivalPoint:{x:40,y:.16,z:0}});
 const stale=s.request(a.id,'cold-placement'),current=s.request(a.id,'current');await flush();tick(s);
 assert.equal(prepared,0);assert.equal(await stale.result,false);assert.equal(await current.result,true);assert.equal(a.position.x,40);
});
test('a recall larger than the visual pool waits in bounded sequential portals with distinct physical slots',async()=>{
 const actors=Array.from({length:24},(_,i)=>({id:'cat'+i,position:new T.Vector3(i*3,.16,0),radius:i<3?1.2:.6}));
 let active=0,peak=0,arrivals=0;const effects={acquire(){if(active===2)return null;active++;peak=Math.max(active,peak);return{};},release(v){if(v)active--;},update(){}};
 const s=createCatTeleportationSystem({getActors:()=>actors,effects});
 s.register({destinationId:'gather:atoll-park',arrivalPoints:()=>actors.map((_,i)=>({x:1000+i*4,y:.16,z:375})),checkArrival:p=>p.y===.16});
 const ops=actors.map(a=>s.request(a.id,'gather:atoll-park',{onArrival:()=>{arrivals++;return true;}}));await flush();tick(s,110);
 assert.equal(peak,2);assert.equal(active,0);assert.equal(arrivals,24);assert.equal(s.diagnostics.active,0);
 for(const op of ops)assert.equal(await op.result,true);
 for(const a of actors)for(const b of actors)if(a!==b)assert(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)>=a.radius+b.radius+.2);
});
test('removing a dynamic destination cancels both pending and committed hops without starting its activity',async()=>{
 const a={id:'luna',position:new T.Vector3(0,.16,0)},errors=[],s=createCatTeleportationSystem({getActors:()=>[a],onError:m=>errors.push(m)});let started=0;
 const entry={destinationId:'paid-player-placement',arrivalPoint:{x:50,y:.16,z:0}};
 s.register(entry);const pending=s.request(a.id,entry.destinationId,{onArrival:()=>started++});s.unregister(entry.destinationId);await flush();tick(s);
 assert.equal(await pending.result,false);assert.equal(a.position.x,0);
 s.register(entry);const committed=s.request(a.id,entry.destinationId,{onArrival:()=>started++});await flush();tick(s,5);assert(a.position.y>.16);
 s.unregister(entry.destinationId);assert.equal(await committed.result,false);assert.deepEqual(a.position.toArray(),[50,.16,0]);assert.equal(started,0);assert.equal(errors.length,2);
});
test('a surface lost during portal opening fails after bounded wait and restores the valid origin',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0)},errors=[];let available=true,releases=0;
 const s=createCatTeleportationSystem({getActors:()=>[a],onError:m=>errors.push(m),effects:{acquire:()=>({}),update(){},release(v){if(v)releases++;}}});
 s.register({destinationId:'physical-floor',arrivalPoint:{x:90,y:.16,z:0},checkArrival:()=>available});
 const op=s.request(a.id,'physical-floor');await flush();tick(s,3);available=false;tick(s,155);
 assert.equal(await op.result,false);assert.deepEqual(a.position.toArray(),[0,.16,0]);assert.equal(errors.length,1);assert.equal(releases,1);assert.equal(s.has(a.id),false);
});
test('locked requests preserve the existing valid command and eligibility is checked again at commit',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0)},s=createCatTeleportationSystem({getActors:()=>[a]});let unlocked=true,arrivals=0;
 s.register({destinationId:'open',arrivalPoint:{x:90,y:.16,z:0},requiredConditions:()=>unlocked});
 s.register({destinationId:'locked',requiredConditions:()=>false,arrivalPoint:{x:200,y:.16,z:0}});
 const op=s.request(a.id,'open',{onArrival:()=>arrivals++});assert.equal(s.request(a.id,'locked'),null);assert.equal(s.operations.get(a.id),op);
 await flush();tick(s,3);unlocked=false;tick(s);assert.equal(await op.result,false);assert.equal(arrivals,0);assert.equal(a.position.x,0);
});
test('a relocation observer can safely cancel without leaving the actor on its animated hop',async()=>{
 const a={id:'chichi',position:new T.Vector3(0,.16,0)};let s,calls=0;
 s=createCatTeleportationSystem({getActors:()=>[a],onRelocate:id=>{calls++;s.cancel(id);}});
 s.register({destinationId:'safe-floor',arrivalPoint:{x:80,y:.16,z:0}});const op=s.request(a.id,'safe-floor');await flush();tick(s);
 assert.equal(await op.result,false);assert.equal(calls,1);assert.deepEqual(a.position.toArray(),[80,.16,0]);
});
test('save/load during recall retains the island command and stores the actual supported floor after relocation',async()=>{
 const {newGame,loadGame,SAVE_KEY}=await import('../public/economy.js'),{BIOMES,byBiome}=await import('../public/game-data.js'),{gatherCats}=await import('../public/adoption.js'),{captureCatLocations}=await import('../public/cat-locations.js');
 const now=Date.UTC(2026,10,28),game=newGame(now);game.unlocked=BIOMES.map(b=>b.id);
 const b=byBiome('atoll-park'),goal={x:b.center[0],y:.16,z:b.center[1]+375},a={id:'chichi',position:new T.Vector3(0,.16,0),radius:.6},s=createCatTeleportationSystem({getActors:()=>[a]});
 const commanded=gatherCats(game,b.id,{ids:[a.id],now});s.register({destinationId:'gather:'+b.id,arrivalPoint:goal,checkArrival:p=>p.y===.16});
 const op=s.request(a.id,'gather:'+b.id);await flush();tick(s,2);
 const before=captureCatLocations(commanded,commanded,[{id:a.id,yaw:0,...s.saveProjection(a.id)}],now+200);
 assert.equal(before.catLocations.chichi,undefined);assert.equal(before.catPosition.biome,b.id);
 tick(s,3);assert(a.position.y>.16);const projection=s.saveProjection(a.id);assert.equal(projection.transient,false);assert.equal(projection.position.y,.16);
 const saved=captureCatLocations(before,before,[{id:a.id,yaw:0,...projection}],now+500),restored=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(saved):null},now+500,{advance:false});
 assert.equal(restored.catLocations.chichi.biome,b.id);assert.equal(restored.catLocations.chichi.y,.16);assert.equal(restored.catLocations.chichi.z,375);assert.equal(restored.coins,game.coins);assert.equal(restored.diamonds,game.diamonds);assert.deepEqual(restored.placements,game.placements);
 tick(s);assert(await op.result);assert.equal(s.saveProjection(a.id),null);
});
