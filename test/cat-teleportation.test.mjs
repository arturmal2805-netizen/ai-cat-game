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
