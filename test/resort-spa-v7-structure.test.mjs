import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {SPA_PALACE as P,spaPalaceContains,spaPalaceRoofY,spaPalacePools} from '../public/resort-spa-layout-v7.js';
const finish=g=>{let n;while(!(n=g.next()).done);return n.value;};

test('V7 continuous real slabs preserve pool/atrium/stair openings, clear headroom and the original SPA root',()=>{
 const root=finish(resortSpaModelSteps({layoutVersion:7}));root.updateWorldMatrix(true,true);
 try{
  assert.equal(root.name,'CHICHI CAT SPA & WELLNESS RESORT');assert.equal(root.userData.id,'chichi-underwater-spa');
  assert.equal(root.userData.zones.size,8);assert.equal(root.userData.palace.independentRoomPlatforms,0);
  const floors=[];root.userData.surfaces.traverse(o=>{if(o.name.startsWith('SPA continuous sealed floor'))floors.push(o);});assert.equal(floors.length,3);
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0),y=P.baseY;
  const hits=(x,h,z,meshes,dir=down)=>{ray.set(new T.Vector3(x,h,z),dir);ray.far=1000;return ray.intersectObjects(meshes,true);};
  assert(hits(-120,y+1,225,floors).some(h=>Math.abs(h.point.y-y)<1e-5),'the wing is real usable floor, not an open bridge');
  assert(!hits(0,y+P.rise+1,203,[floors[1]]).length,'the open atrium is not sealed by a broad floor box');
  assert(!hits(25,y+P.rise+1,210,[floors[1]]).length,'the stairwell opening is real');
  for(const p of spaPalacePools())assert(!hits(p.x,p.y+.5,p.z,floors).some(h=>Math.abs(h.point.y-p.y)<.01),p.id+' floor must not cap its water hole');
  const night=[];root.userData.surfaces.traverse(o=>{if(o.name.startsWith('SPA preserved'))night.push(o);});assert.equal(night.length,2);
  assert.equal(night.find(o=>o.name.includes('midnight')).material.color.getHex(),0x293e57);
  for(const p of spaPalacePools().filter(p=>p.room==='resort-vip'))assert(!hits(p.x,p.y+.5,p.z,night).length,p.id+' night finish must keep the basin hole');
  const allFloors=[...floors,...night];const ceiling=hits(0,y+P.rise+.02,226,allFloors,up)[0];assert(ceiling&&ceiling.point.y-(y+P.rise)>=10.8);
  let roof;root.userData.shell.traverse(o=>{if(o.name==='SPA one continuous fused glass roof')roof=o;});assert(roof);
  const a=roof.geometry.attributes.position;for(let i=0;i<a.count;i++)assert(Math.abs(a.getY(i)-spaPalaceRoofY(a.getX(i),a.getZ(i)))<1e-4);
  const sky=root.userData.basins.find(b=>b.userData.palacePool.sky);assert(sky.userData.bed.material.transparent,'the actual sky-pool bed must remain transparent');for(const o of [sky.userData.bed,sky.userData.wall,sky.userData.surface]){assert(o.visible,'actual optical face remains independently sorted');assert(o.userData.resortSeparateTransparency);assert.equal(o.renderOrder,0,'native camera-depth sorting works from both sides');}
  assert(!spaPalaceContains(20,294),'a real access shaft stays outside the plates');
  const nav=createResortSpaNavigation(root),portalFrom={x:0,y:.012,z:293.2},portalTo={x:0,y:.012,z:287};
  assert(nav.segmentClear(portalFrom,portalTo,.571),'the full original body passes through the real façade portal and segmented arch');
  assert(!nav.segmentClear({...portalFrom,x:4},{...portalTo,x:4},.571),'the adjacent pressure wall stays closed');
  assert.equal(root.userData.palace.facade.roofRibs,20);
  assert.equal(root.userData.palace.facade.entryArchSegments,40);
 }finally{root.userData.dispose();}
});

test('Thermal is double-height and the two real balcony sheets end inside its existing water without crossing the middle slab',()=>{
 const root=finish(resortSpaModelSteps({layoutVersion:7}));try{
 const floors=[];root.userData.surfaces.traverse(o=>{if(o.name==='SPA continuous sealed floor 1')floors.push(o);});
 const ray=new T.Raycaster(new T.Vector3(0,P.baseY+P.rise+1,266),new T.Vector3(0,-1,0));ray.far=2;assert.equal(ray.intersectObjects(floors).length,0);
 assert.equal(root.userData.thermalCascades.length,2);for(const f of root.userData.thermalCascades){const a=f.fall.geometry.attributes.position,r=f.spec.receiver;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(Math.abs(y)<1e-5)assert(Math.hypot((x-r.x)/r.rx,(z-r.z)/r.rz)<1,'fall ends inside Thermal');if(Math.abs(y-P.rise)<.7){ray.set(new T.Vector3(x,P.baseY+P.rise+1,z),new T.Vector3(0,-1,0));assert.equal(ray.intersectObjects(floors).length,0,'real middle slab opening');}}
 }
 const vaults=[];root.userData.shell.traverse(o=>{if(o.name.includes('full-height'))vaults.push(o);});assert.equal(vaults.length,2);for(const o of vaults){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)assert(a.getY(i)>=P.rise*2+P.ceilingMinimum-1e-4,'no low black cap');}
 }finally{root.userData.dispose();}
});

test('actual roof triangles clear both star vaults; inset basin coping never overlaps the real floor and bath bottoms stay above the middle service ceiling',()=>{
 const root=finish(resortSpaModelSteps({layoutVersion:7}));root.updateMatrixWorld(true);try{
  const floors=[],vaults=[];let roof,service;root.userData.surfaces.traverse(o=>{if(o.name.startsWith('SPA continuous sealed floor')||o.name.startsWith('SPA preserved'))floors.push(o);});root.userData.shell.traverse(o=>{if(o.name==='SPA one continuous fused glass roof')roof=o;if(o.name==='SPA continuous middle service ceiling')service=o;if(o.name.includes('full-height'))vaults.push(o);});const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);ray.far=200;
  for(const p of spaPalacePools()){ray.set(new T.Vector3(p.x+p.rx+.5,p.y+1,p.z),down);assert(!ray.intersectObjects(floors).some(h=>Math.abs(h.point.y-p.y)<.001),p.id+' coping must occupy an inset, not a coplanar floor overlap');}
  for(const v of vaults){v.geometry.computeBoundingBox();const b=v.geometry.boundingBox;let samples=0;for(let x=b.min.x+2;x<b.max.x-2;x+=3)for(let z=b.min.z+2;z<b.max.z-2;z+=3){ray.set(new T.Vector3(x,-45,z),down);const a=ray.intersectObject(roof)[0],c=ray.intersectObject(v)[0];if(a&&c){samples++;assert(a.point.y-c.point.y>=.9,JSON.stringify({vault:v.name,x,z,roof:a.point.y,vaultY:c.point.y}));}}assert(samples>200);}
  assert.equal(service.material.side,T.DoubleSide);for(const b of root.userData.basins.filter(b=>b.userData.palacePool.room==='resort-vip')){const p=b.userData.palacePool;ray.set(new T.Vector3(p.x,P.baseY+P.rise+.1,p.z),new T.Vector3(0,1,0));const ceiling=ray.intersectObject(service)[0],bed=ray.intersectObject(b.userData.bed)[0];assert(ceiling&&bed&&ceiling.distance<bed.distance);assert(ceiling.point.y-(P.baseY+P.rise)>=10.8);}
  ray.set(new T.Vector3(0,P.baseY+P.rise+.1,203),new T.Vector3(0,1,0));assert.equal(ray.intersectObject(service).length,0,'there is no opaque service-ceiling backing beneath the sky pool');
 }finally{root.userData.dispose();}
});
