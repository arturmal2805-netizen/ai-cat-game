import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {ZOO_EXHIBITS,ZOO_BIOME} from '../public/zoo-data.js';import {zooEnclosureCameraView,zooCameraGuests,randomZooCameraGuest} from '../public/zoo-camera.js';
test('every habitat fits an elevated front camera on portrait, landscape and desktop without cropping its tank or branch jump',()=>{
 for(const e of ZOO_EXHIBITS)for(const aspect of [.46,.6,.82,1.5,2.15]){
  const view=zooEnclosureCameraView(e,45,aspect),camera=new T.PerspectiveCamera(45,aspect,.1,1200),[cx,cz]=ZOO_BIOME.center;assert.equal(view.elevation,.72);camera.position.copy(view.target).add(new T.Vector3(Math.sin(view.azimuth)*Math.cos(view.elevation),Math.sin(view.elevation),Math.cos(view.azimuth)*Math.cos(view.elevation)).multiplyScalar(view.distance));camera.lookAt(view.target);camera.updateMatrixWorld();
  for(const x of [-e.radius,e.radius])for(const z of [-e.radius,e.radius])for(const y of [-.4,e.species==='gorilla'?7:5]){const p=new T.Vector3(cx+e.x+x,y,cz+e.z+z).project(camera);assert.ok(Math.abs(p.x)<.92&&Math.abs(p.y)<.93&&p.z<1,e.id+' camera crops '+p.toArray());}
 }
});
test('random guest camera accepts actual current zoo visitors, includes walking cats and excludes remote cats and nonvisitor staff',()=>{
 const pos={x:207,z:136},visits=[{kind:'zoo',biome:'magic-zoo',catId:'chichi'},{kind:'zoo',biome:'magic-zoo',catId:'tiny'},{kind:'zoo',biome:'magic-zoo',catId:'tiny'},{kind:'zoo',biome:'magic-zoo',catId:'remote'},{kind:'cafe',biome:'foodcourt',catId:'barista'}],actors=[{id:'chichi',position:pos},{id:'tiny',position:{x:220,z:140}},{id:'remote',position:{x:0,z:0}},{id:'barista',position:pos,staff:true},{id:'idle',position:pos}];
 assert.deepEqual(zooCameraGuests(actors),[{id:'chichi'},{id:'tiny'},{id:'idle'}]);assert.equal(randomZooCameraGuest(actors,'chichi',()=>0),'tiny');assert.equal(randomZooCameraGuest(actors,null,()=>0),'chichi');assert.equal(randomZooCameraGuest(actors,null,()=>.99),'idle');assert.equal(randomZooCameraGuest([],null),null);assert.equal(randomZooCameraGuest([],null),null);
});
