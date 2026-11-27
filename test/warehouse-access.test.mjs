import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {WAREHOUSE_ACCESS as A,warehouseOffers,warehouseActivity} from '../public/warehouse-access-data.js';
import {createWarehouseShuttleRoute,warehouseShuttleClear} from '../public/warehouse-shuttle-route.js';
import {warehouseApertureSteps} from '../public/warehouse-aperture.js';
import {runSceneSteps} from '../public/scene-tasks.js';
test('Warehouse offers are compact, stable, unlocked-only and use the existing leisure action vocabulary',()=>{assert.deepEqual(warehouseOffers({unlocked:[]}),[]);const offers=warehouseOffers({unlocked:['autumn']});assert.equal(offers.length,2);for(const o of offers){assert(warehouseActivity(o.id));assert(['rest','explore'].includes(o.action));assert(o.name.length<30);assert.equal(o.type,o.id);}});
test('small shuttle route retains an open swept hull, physical floor and a continuous return without teleporting',()=>{const route=createWarehouseShuttleRoute();assert(route.length>3000);assert(route.length<4500);const a=route.sample(0),b=route.sample(route.length),back=route.sample(0,true);for(const k of ['x','y','z']){assert(Math.abs(a[k]-A.departure[k])<1e-6);assert(Math.abs(b[k]-A.dock[k])<1e-6);assert.equal(back[k],b[k]);}
 for(let d=0;d<route.length;d+=2){const p=route.sample(d);for(const offset of [-3,0,3])assert(warehouseShuttleClear({...p,x:p.x+Math.sin(p.yaw)*offset,z:p.z+Math.cos(p.yaw)*offset}),JSON.stringify({d,p,offset}));}
});
test('the actual doorway cuts crossing triangles rather than hiding whole facade segments',()=>{const wall=new T.Mesh(new T.BoxGeometry(20,12,.3));const original=wall.geometry.attributes.position.array.slice();wall.position.set(0,5,3);const hole=new T.Box3(new T.Vector3(-2,-2,2),new T.Vector3(2,7,4));runSceneSteps(warehouseApertureSteps(wall,hole));wall.updateMatrixWorld(true);assert.deepEqual(wall.geometry.attributes.position.array.slice(0,original.length),original,'unchanged vertex bytes are retained');assert(wall.geometry.attributes.position.count<100,'cut only adds boundary vertices');assert.equal(new T.Raycaster(new T.Vector3(0,3,8),new T.Vector3(0,0,-1),0,20).intersectObject(wall).length,0);assert(new T.Raycaster(new T.Vector3(5,3,8),new T.Vector3(0,0,-1),0,20).intersectObject(wall).length>0);for(const a of Object.values(wall.geometry.attributes))assert(Array.from(a.array).every(Number.isFinite));});

test('pressure entry has real independently moving doors, a constant floor and no simultaneously open seals',async()=>{
 const {warehouseExteriorSteps}=await import('../public/warehouse-exterior.js'),{createWarehouseAirlock}=await import('../public/warehouse-airlock.js');
 const root=runSceneSteps(warehouseExteriorSteps());root.updateMatrixWorld(true);assert.equal(root.userData.phase,2);assert.equal(root.userData.interiorEquipped,false);
 const core=root.children.filter(o=>o!==root.userData.entry),near=new T.Vector3(A.chamber.x,A.floor+2,A.chamber.z+15),ray=new T.Raycaster(near,new T.Vector3(0,0,-1),0,near.z-A.lobby.z+5);
 assert.equal(ray.intersectObjects(core,true).length,0,'actual lower facade and all cornices clear the working aperture');
 assert(new T.Raycaster(near.clone().add(new T.Vector3(7,0,0)),new T.Vector3(0,0,-1),0,near.z-A.lobby.z+5).intersectObjects(core,true).length>0,'neighbouring glazing remains sealed');
 for(const entering of [true,false]){const transit=createWarehouseAirlock(entering);for(let i=0;i<2000&&!transit.frame.done;i++){const f=transit.step(1/120);assert.equal(f.position.y,A.foot,'no elevator movement');assert(f.outer<1e-6||f.inner<1e-6);if(f.inner>.01)assert(f.water<.001);if(f.outer>.01)assert(f.water>.999);root.userData.entry.userData.update(f.outer,f.inner,f.water,i/120);}assert(transit.frame.done);}
});

test('a bounded submarine fleet carries every queued visitor through both doors and back without duplicate actors',async()=>{
 const {createWarehouseVisits}=await import('../public/warehouse-visit-runtime.js');const actors=Array.from({length:7},(_,i)=>({id:i?'cat-'+i:'chichi',position:new T.Vector3(A.shore.x,A.shore.y,A.shore.z)})),done=[],phases=new Set();
 const r=createWarehouseVisits({origin:{x:0,z:0},getActors:()=>actors,onComplete:(id,result)=>done.push({id,...result})});for(const a of actors)assert(r.start(a.id));assert.equal(r.start('chichi'),false);
 for(let i=0;i<30000&&r.visits.size;i++){r.update(.1,i*.1);assert(r.boats.filter(b=>b.id).length<=3);for(const v of r.visits.values()){phases.add(v.phase);assert(Number.isFinite(v.frame.position.x+v.frame.position.y+v.frame.position.z));}}
 assert.equal(r.visits.size,0);assert.equal(done.length,actors.length);assert.equal(new Set(done.map(v=>v.id)).size,actors.length);assert(done.every(v=>v.completed));for(const p of ['boarding','outbound','airlock-in','visit','airlock-out','inbound','disembark'])assert(phases.has(p),p);
});

test('entrance floor is the actual scaled native base and original facade vertices survive the aperture',async()=>{
 const {warehouseExteriorSteps}=await import('../public/warehouse-exterior.js');const root=runSceneSteps(warehouseExteriorSteps());root.updateMatrixWorld(true);const floor=root.children.find(o=>o.name.startsWith('Neutral sealed'));
 const hit=new T.Raycaster(new T.Vector3(A.lobby.x+7,A.foot+5,A.lobby.z),new T.Vector3(0,-1,0),0,10).intersectObject(floor,true)[0];assert(hit);assert(Math.abs(hit.point.y-A.floor)<1e-4,'gallery matches the native dry floor');const slab=root.children.find(o=>o.name.startsWith('Seafloor foundation'));const solid=new T.Raycaster(new T.Vector3(A.lobby.x+7,A.foot+5,A.lobby.z),new T.Vector3(0,0-1,0),0,10).intersectObject(slab,true)[0];assert(solid);assert(A.floor>=solid.point.y&&A.floor-solid.point.y<.03,'cat paws stay above the actual beveled slab cap');
});
test('Warehouse activities validate through the existing AI catalogue without new inference or money fields',async()=>{
 const {newGame}=await import('../public/economy.js'),{leisureOffers,validateLeisureOffers}=await import('../public/leisure-data.js');const g=newGame(0);g.unlocked.push('autumn');const before=structuredClone(g),offers=leisureOffers(g,0),wh=offers.filter(o=>o.id.startsWith('warehouse-'));assert.equal(wh.length,2);assert.deepEqual(validateLeisureOffers(wh),wh);assert.deepEqual(g,before);assert.throws(()=>validateLeisureOffers([{...wh[0],action:'eat'}]));assert.throws(()=>validateLeisureOffers([{...wh[0],biome:'moon'}]));
});
test('only explicitly authorized entrance/controller/catalogue files change from the published broad Warehouse',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto'),scope=(await import('../docs/specifications/warehouse-access-protection-2026-11-27.json',{with:{type:'json'}})).default;
 assert(Object.keys(scope.frozenFiles).length>400);for(const [file,hash]of Object.entries(scope.frozenFiles))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
test('cancellation in every physical phase returns safely; manual takeover stays latched through boarding and flight',async()=>{
 const {createWarehouseVisits}=await import('../public/warehouse-visit-runtime.js');
 for(const target of ['pending','shore-trip','await-board','boarding','outbound','leaving-boat','airlock-in','lobby-walk','visit','lobby-return','airlock-out','return-boarding','inbound','disembark']){
  const actor={id:'chichi',position:new T.Vector3(A.shore.x+2,A.shore.y,A.shore.z)},done=[];const r=createWarehouseVisits({origin:{x:0,z:0},getActors:()=>[actor],onComplete:(id,result)=>done.push(result)});r.start('chichi');let seen=false;
  for(let i=0;i<20000&&r.has('chichi');i++){const v=r.get('chichi');if(v.phase===target&&!seen){seen=true;r.cancel('chichi');}r.update(.1,i*.1);if(r.frame('chichi'))actor.position.copy(r.frame('chichi').position);}
  assert(seen,target);assert(!r.has('chichi'),target+' finishes return');assert.equal(done.length,1);assert.equal(done[0].completed,false,target);
 }
 let starts=0;const actor={id:'chichi',position:new T.Vector3(A.shore.x,A.shore.y,A.shore.z)},r=createWarehouseVisits({origin:{x:0,z:0},getActors:()=>[actor],onManualReady:()=>{starts++;return true;}});r.start('chichi');r.requestManual();for(let i=0;i<5000&&!r.manual;i++){r.update(.1,i*.1);actor.position.copy(r.frame('chichi').position);}assert.equal(r.manual,'chichi');assert.equal(starts,1);actor.position.x+=5;for(let i=0;i<10;i++)r.update(.1,500+i);assert.equal(starts,1,'manual start happens once');assert.equal(r.frame('chichi').position.x,actor.position.x);r.releaseManual();r.cancel('chichi');for(let i=0;i<15000&&r.has('chichi');i++)r.update(.1,600+i*.1);assert(!r.has('chichi'));
});

test('all three shuttle slots retain full hull clearance in both shipping lanes',()=>{
 for(let slot=0;slot<3;slot++){const route=createWarehouseShuttleRoute(1024,slot);for(const reverse of [false,true])for(let d=0;d<route.length;d+=3){const p=route.sample(d,reverse,{},reverse?-12:12);for(const offset of [-3.1,0,3.1]){const q={x:p.x+Math.sin(p.yaw)*offset,y:p.y+Math.sin(p.pitch)*offset,z:p.z+Math.cos(p.yaw)*offset};assert(warehouseShuttleClear(q),JSON.stringify({slot,reverse,d,q}));}}}
});

test('actual docking berths keep the native submarine hull above water rather than inside a solid slab',async()=>{
 const {warehouseExteriorSteps}=await import('../public/warehouse-exterior.js'),{warehouseFleetSteps}=await import('../public/warehouse-shuttle-models.js');const root=runSceneSteps(warehouseExteriorSteps()),fleet=runSceneSteps(warehouseFleetSteps({x:0,z:0}));root.updateWorldMatrix(true,true);fleet.updateWorldMatrix(true,true);
 const solids=[];root.userData.entry.traverse(o=>{if(o.isMesh&&!o.material.transparent&&o.material.type!=='ShaderMaterial')solids.push(o);});
 for(let slot=0;slot<3;slot++){const x=A.dock.x+(slot-1)*14,z=A.dock.z;
  assert.equal(new T.Raycaster(new T.Vector3(x,A.floor+.3,z),new T.Vector3(0,-1,0),0,3.5).intersectObjects(solids,true).length,0,'water berth is genuinely cut through the floor');
  const ramp=fleet.userData.dockRamps[slot];ramp.visible=true;ramp.updateWorldMatrix(true,true);for(const t of [.1,.3,.5,.7,.9]){const px=x+(A.outside.x-x)*t,pz=z-.25+(A.outside.z-(z-.25))*t,hit=new T.Raycaster(new T.Vector3(px,A.floor+1,pz),new T.Vector3(0,-1,0),0,2).intersectObject(ramp,true)[0];assert(hit,'real gangplank supports each boarding step');assert(Math.abs(hit.point.y-A.floor)<.001);}
 }
 fleet.userData.dispose();root.userData.dispose();
});

test('a late control request during the return voyage transfers once at the dry shore without reversing the boat',async()=>{
 const {createWarehouseVisits}=await import('../public/warehouse-visit-runtime.js');const actor={id:'chichi',position:new T.Vector3(A.shore.x,A.shore.y,A.shore.z)},handoffs=[];const r=createWarehouseVisits({origin:{x:0,z:0},getActors:()=>[actor],onPark:(id,p)=>actor.position.copy(p),onManualReady:id=>{handoffs.push({id,p:actor.position.toArray()});return true;}});r.start('chichi');let requested=false;
 for(let i=0;i<20000&&r.has('chichi');i++){if(r.get('chichi').phase==='inbound'&&!requested){r.requestManual();requested=true;}r.update(.1,i*.1);if(r.frame('chichi'))actor.position.copy(r.frame('chichi').position);}
 assert(requested);assert.equal(handoffs.length,1);assert.deepEqual(handoffs[0].p,[A.shore.x,A.shore.y,A.shore.z]);assert(!r.has('chichi'));
});
