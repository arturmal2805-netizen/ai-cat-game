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
  assert(!hits(0,y+13,203,[floors[1]]).length,'the open atrium is not sealed by a broad floor box');
  assert(!hits(25,y+13,210,[floors[1]]).length,'the stairwell opening is real');
  for(const p of spaPalacePools())assert(!hits(p.x,p.y+.5,p.z,floors).some(h=>Math.abs(h.point.y-p.y)<.01),p.id+' floor must not cap its water hole');
  const night=[];root.userData.surfaces.traverse(o=>{if(o.name.startsWith('SPA preserved'))night.push(o);});assert.equal(night.length,2);
  assert.equal(night.find(o=>o.name.includes('midnight')).material.color.getHex(),0x293e57);
  for(const p of spaPalacePools().filter(p=>p.room==='resort-vip'))assert(!hits(p.x,p.y+.5,p.z,night).length,p.id+' night finish must keep the basin hole');
  const allFloors=[...floors,...night];const ceiling=hits(0,y+12+.02,226,allFloors,up)[0];assert(ceiling&&ceiling.point.y-(y+12)>=10.8);
  let roof;root.userData.shell.traverse(o=>{if(o.name==='SPA one continuous fused glass roof')roof=o;});assert(roof);
  const a=roof.geometry.attributes.position;for(let i=0;i<a.count;i++)assert(Math.abs(a.getY(i)-spaPalaceRoofY(a.getX(i),a.getZ(i)))<1e-4);
  const sky=root.userData.basins.find(b=>b.userData.palacePool.sky);assert(sky.userData.bed.material.transparent,'the actual sky-pool bed must remain transparent');
  assert(!spaPalaceContains(20,294),'a real access shaft stays outside the plates');
  const nav=createResortSpaNavigation(root),portalFrom={x:0,y:.012,z:293.2},portalTo={x:0,y:.012,z:287};
  assert(nav.segmentClear(portalFrom,portalTo,.571),'the full original body passes through the real façade portal and segmented arch');
  assert(!nav.segmentClear({...portalFrom,x:4},{...portalTo,x:4},.571),'the adjacent pressure wall stays closed');
  assert.equal(root.userData.palace.facade.roofRibs,20);
  assert.equal(root.userData.palace.facade.entryArchSegments,40);
 }finally{root.userData.dispose();}
});
