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
