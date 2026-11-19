import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {RESORT_ZONES,resortSpaSeat,RESORT_SPA as S} from '../public/resort-spa-data.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {resortSurfaceMaps} from '../public/resort-spa-surfaces.js';
import {resortSpaView} from '../public/resort-spa-camera.js';
import {resortInteriorLighting} from '../public/resort-spa-finishes.js';
import {createMallRoomLights} from '../public/mall-room-light.js';
import {stepChichiWalk} from '../public/chichi-manual.js';
import {mosaBedY,mosaWaterRadius} from '../public/mosasaur-data.js';
import {createResortSpaRuntime} from '../public/resort-spa-runtime.js';
import {createResortAquariumFish} from '../public/resort-spa-aquarium.js';
function model(){const it=resortSpaModelSteps();let r;do{r=it.next();}while(!r.done);return r.value;}
test('SPA fish keep distinct real anatomy and every moving membrane inside their glass tank',()=>{
 const p=new T.Vector3(),dimensions=[];
 for(const kind of ['betta','angelfish','ray']){
  const fish=createResortAquariumFish(kind),box=new T.Box3().setFromObject(fish.root);dimensions.push(box.getSize(new T.Vector3()).toArray());
  for(let time=0;time<25;time+=.7){fish.root.userData.animate(time);fish.root.position.set(Math.cos(time)*2.4,12+Math.sin(time*.7)*.65,203+Math.sin(time)*2.4);fish.root.rotation.y=-time-Math.PI/2;fish.root.rotation.z=Math.sin(time*2)*.07;fish.root.updateMatrixWorld(true);fish.root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert(Math.hypot(p.x,p.z-203)<5.7,kind+' glass wall');assert(p.y>9.1&&p.y<15.1,kind+' tank cap');}});}
  fish.dispose();
 }
 assert.equal(new Set(dimensions.map(d=>JSON.stringify(d))).size,3);
});
test('glass sky pool has a real transparent bed, an unblocked walking bridge and no opaque floor underneath',()=>{
 const root=model(),pool=root.getObjectByName('Glass Sky Pool'),bed=pool.userData.bed,nav=createResortSpaNavigation(root);
 assert.equal(root.userData.zones.size,14);assert.deepEqual([...root.userData.zones.keys()],[...RESORT_ZONES.map(z=>z.id)]);
 assert(bed.material.transparent&&bed.material.opacity<.4);assert.equal(bed.material.side,T.DoubleSide);
 const ray=new T.Raycaster(new T.Vector3(0,-154.5,203),new T.Vector3(0,1,0));ray.far=6;
 const hits=ray.intersectObjects([root.userData.surfaces,root.userData.solid],true);assert(hits.some(h=>h.object===bed));assert(hits.every(h=>h.object.material.transparent),'lower atrium must see through the actual floor');
 assert(nav.segmentClear({x:0,y:18.012,z:224},{x:0,y:18.012,z:221.8},.571));
 root.userData.dispose();
});
test('SPA PBR color maps are sRGB while normal and roughness charts remain linear data',()=>{
 for(const kind of ['marble','fabric']){const maps=resortSurfaceMaps(kind);assert.equal(maps.map.colorSpace,T.SRGBColorSpace);assert.equal(maps.normalMap.colorSpace,T.NoColorSpace);assert.equal(maps.roughnessMap.colorSpace,T.NoColorSpace);for(const t of Object.values(maps))t.dispose();}
});
test('SPA overview eye is inside real open water rather than the old shallow shoreline wall',()=>{
 const v=resortSpaView(),a=v.azimuth,e=v.elevation,d=v.distance,x=v.x+Math.sin(a)*Math.cos(e)*d,z=v.z-20+Math.cos(a)*Math.cos(e)*d,y=v.y+Math.sin(e)*d;
 assert(mosaWaterRadius(x,z)<1);assert(mosaBedY(x,z)<y-5);
});
test('sealed SPA illumination keeps its local lamps, emissions and reflection hook without altering outside materials',()=>{
 const own=new T.MeshStandardMaterial(),outside=new T.MeshStandardMaterial(),original=outside.onBeforeCompile,lights=createMallRoomLights();
 resortInteriorLighting(own,lights);const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <opaque_fragment>'};own.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/outgoingLight-totalEmissiveRadiance/);assert.match(shader.fragmentShader,/totalEmissiveRadiance;/);assert.match(shader.fragmentShader,/uMallProbe/);assert(shader.uniforms.uMallRoomLamps);assert.match(own.customProgramCacheKey(),/spa-sealed-interior/);assert.equal(outside.onBeforeCompile,original);
 own.dispose();outside.dispose();lights.texture.dispose();
});

test('segmented curved seats retain real support and do not close their interior with a merged bounding box',()=>{
 const root=model(),nav=createResortSpaNavigation(root);
 for(const id of ['resort-cabana','resort-nap','resort-amber','resort-midnight']){
  const zone=RESORT_ZONES.find(z=>z.id===id);
  for(let slot=0;slot<zone.seats;slot++){
   const seat=resortSpaSeat(zone,slot);
   assert(nav.support({x:seat.x,y:seat.y-S.y+.92,z:seat.z},.571),id+' seat '+slot);
  }
 }
 root.userData.dispose();
});
test('manual Chichi physically steps off a Nap seat and cannot send the camera through the sealed dome even during cutaway',()=>{
 const root=model(),nav=createResortSpaNavigation(root),zone=RESORT_ZONES.find(z=>z.key==='nap'),seat=resortSpaSeat(zone,6),state={x:seat.x,y:seat.y-S.y+.92,z:seat.z,yaw:0,biome:'autumn'},levels=[];
 for(let i=0;i<16;i++){stepChichiWalk(state,.1,{forward:1,side:0,heading:0},p=>{const hit=nav.support(p,.571);return hit?{y:hit.y,biome:'autumn'}:null;},.571);levels.push(state.y);}
 assert(state.z-seat.z>3);assert(levels.some(y=>Math.abs(y-18.472)<.03));assert(Math.abs(state.y-18.012)<.03);
 for(const hidden of [false,true]){if(hidden)root.userData.setInspectionLevel(0);assert.equal(nav.cameraClear({x:0,y:35,z:203},{x:0,y:39,z:203}),false);assert.equal(nav.cameraClear({x:0,y:39,z:203},{x:0,y:35,z:203}),false);}
 root.userData.dispose();
});
test('VIP keeps its four original wet contacts and adds four supported private lounges with complete real-floor return paths',()=>{
 const root=model(),nav=createResortSpaNavigation(root),zone=RESORT_ZONES.find(z=>z.key==='vip'),local=p=>({...p,y:p.y-S.y}),absolute=p=>({...p,y:p.y+S.y});
 for(let slot=0;slot<4;slot++)assert(resortSpaSeat(zone,slot).pool,'original wet slot '+slot);
 for(let slot=4;slot<8;slot++){
  const c=resortSpaSeat(zone,slot),position={...c.approach,z:c.approach.z+.2},actions=new Set();let bills=0,uses=0,result;
  assert(!c.pool);assert(nav.support(local(c.seat),.571),'native seat support '+slot);
  const runtime=createResortSpaRuntime({route:(a,b,r)=>nav.path(local(a),local(b),r)?.map(absolute),segmentClear:(a,b,r)=>nav.segmentClear(local(a),local(b),r),onPurchase:()=>{bills++;return'vip-ticket';},onUse:()=>{uses++;return true;},onComplete:(id,v)=>result=v});
  assert(runtime.start({catId:'chichi',zoneId:zone.id,position}));assert.equal(runtime.get('chichi').slot,slot);
  for(let i=0;i<1000&&runtime.has('chichi');i++){runtime.step(.1);const f=runtime.frame('chichi');if(f)actions.add(f.action);}
  assert(!runtime.has('chichi'),'VIP lounge return '+slot);assert(result.completed);assert.equal(bills,1);assert.equal(uses,1);assert(actions.has('private-star-gaze'));assert(actions.has('silk-cushion-rest'));assert.deepEqual(result.position,position);
 }
 root.userData.dispose();
});
test('planted balconies retain fixed shared GPU instance buffers through animation and floor inspection',()=>{
 const root=model(),groups=[];root.traverse(o=>{if(o.isInstancedMesh&&o.name.startsWith('SPA planted balcony'))groups.push(o);});
 assert.equal(groups.length,6);const versions=groups.map(m=>m.instanceMatrix.version);
 for(const m of groups)assert.doesNotMatch(m.material.customProgramCacheKey(),/mall-room-finish|spa-sealed-interior|staticSubmission/,'native instance keeps its native shader');
 for(const time of [0,1,30])root.userData.update(time);
 root.userData.setInspectionLevel(1);for(const m of groups)assert.equal(m.visible,m.userData.resortFloor<=1);
 root.userData.setInspectionLevel(null);for(const m of groups)assert(m.visible);assert.deepEqual(groups.map(m=>m.instanceMatrix.version),versions);
 root.userData.dispose();
});
