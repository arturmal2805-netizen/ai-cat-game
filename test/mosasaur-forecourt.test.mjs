import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BIOMES} from '../public/game-data.js';
import {MOSA_SEA,mosaBedY} from '../public/mosasaur-data.js';
import {mosaReefClearance,MOSA_REEF_INSTANCES} from '../public/mosasaur-reef-data.js';
import {mosaCoralSites} from '../public/mosasaur-corals.js';
import {mallOceanClearanceDistance,MALL_FORECOURT} from '../public/mall-layout.js';
import {mosaReefTemplate} from '../public/mosasaur-reef-sculpt.js';
import * as T from 'three';
import {MOSA_BENTHIC_ROCKS} from '../public/mosasaur-benthic-data.js';
import {mosaRockReefSteps} from '../public/mosasaur-rock-reefs.js';
import {mosaReefSurfaceY} from '../public/mosasaur-reef-data.js';
import {runSceneSteps} from '../public/scene-tasks.js';
const released=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-ocean-expansion-12d478e.json',import.meta.url)));
test('only the requested ocean record changes; every other island stays byte-for-byte equivalent',()=>{
 assert.deepEqual(BIOMES.filter(b=>b.id!=='autumn'),released.biomes.filter(b=>b.id!=='autumn'));
 const old=released.biomes.find(b=>b.id==='autumn'),current=BIOMES.find(b=>b.id==='autumn');
 const {center:oc,radius:or,arrival:oa,...oldTheme}=old,{center:nc,radius:nr,arrival:na,...newTheme}=current;
 assert.deepEqual(newTheme,oldTheme);
 assert.equal(nc[0],oc[0]);assert.ok(nr>or);assert.ok(na[1]>oa[1]);
 assert.ok(Math.abs(MOSA_SEA.rx*MOSA_SEA.rz/(105*100*5)-2)<1e-12);
});
test('the complete fitted rock meshes leave the building and deep forecourt open',()=>{
 const templates=[0,1,2].map(mosaReefTemplate);
 for(const c of MOSA_REEF_INSTANCES){
  const p=templates[c.kind].attributes.position,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);
  for(let i=0;i<p.count;i++){
   const y=c.base+p.getY(i)*c.scaleY;if(y<MALL_FORECOURT.floor-2||y>1)continue;
   const x=c.x+(p.getX(i)*cs+p.getZ(i)*sn)*c.scaleXZ,z=c.z+(-p.getX(i)*sn+p.getZ(i)*cs)*c.scaleXZ;
   assert.ok(mallOceanClearanceDistance(x,z)>2,'rock '+c.id+' intrudes into the actual clear-water volume');
  }
 }
});
test('a submarine body can traverse the entire deep approach, not just stand at its endpoints',()=>{
 const radius=3.5;
 for(const x of [-48,-24,0,24,48])for(const y of [-180,-164,-130,-80,-20])for(let z=130;z<=210;z+=2){
  assert.ok(y-mosaBedY(x,z)>radius,'physical floor crowds the hull');
  assert.ok(mosaReefClearance(x,y,z)>radius,'physical rock crowds the hull');
 }
});
test('sixteen dense mixed gardens leave the middle of the deep approach free',()=>{
 const sites=mosaCoralSites().slice(1024);assert.equal(sites.length,512);
 for(let garden=0;garden<16;garden++){
  const own=sites.slice(garden*32,(garden+1)*32);
  assert.ok(new Set(own.map(p=>p.form)).size>=10);
  assert.ok(own.every(p=>Math.abs(p.x)-p.scale>40));
  const center=own.reduce((a,p)=>({x:a.x+p.x/32,z:a.z+p.z/32}),{x:0,z:0});
  assert.ok(own.every(p=>Math.hypot(p.x-center.x,p.z-center.z)<12));
 }
});
test('new garden stones have real mesh support matching the shared collider and fixed instance buffers',()=>{
 const root=runSceneSteps(mosaRockReefSteps());root.updateMatrixWorld(true);
 assert.equal(root.userData.benthicRocks.length,64);
 const ray=new T.Raycaster(),matrices=[];root.traverse(m=>{if(m.isInstancedMesh)matrices.push([m.instanceMatrix,m.instanceMatrix.version,m.instanceMatrix.array.slice()]);});
 for(const c of MOSA_BENTHIC_ROCKS.filter((_,i)=>i%4===0)){
  ray.set(new T.Vector3(c.x,c.top+6,c.z),new T.Vector3(0,-1,0));const hits=ray.intersectObject(root);
  assert.ok(hits.length,c.id+' must be a rendered solid rock');
  assert.ok(Math.abs(hits[0].point.y-mosaReefSurfaceY(c.x,c.z))<.15,c.id+' collider and rendered stone disagree');
 }
 for(let i=0;i<100;i++)root.userData.update(i);
 for(const [buffer,version,array]of matrices){assert.equal(buffer.version,version);assert.deepEqual(buffer.array,array);}
});

test('garden rock LOD follows actual gardens while retaining every original transform and full-detail buffer',()=>{
 const roots=[false,true].map(spatialBenthic=>runSceneSteps(mosaRockReefSteps({spatialBenthic})));
 const rockLods=root=>{const result=[];root.traverse(o=>{if(o.isLOD&&o.userData.benthicRockIds)result.push(o);});return result;};
 const collect=root=>{
  root.updateMatrixWorld(true);const rows=new Map();
  for(const lod of rockLods(root))for(let level=0;level<3;level++){
   const mesh=lod.levels[level].object;
   for(const [i,id]of mesh.userData.benthicRockIds.entries()){
    const instance=new T.Matrix4();mesh.getMatrixAt(i,instance);
    rows.set(id+':'+level,{instance:[...instance.elements],world:new T.Matrix4().multiplyMatrices(mesh.matrixWorld,instance).elements,geometry:mesh.geometry,sphere:mesh.boundingSphere});
   }
  }
  return rows;
 };
 const [oldRows,newRows]=roots.map(collect);assert.equal(newRows.size,64*3);
 for(const [id,a]of oldRows){const b=newRows.get(id);assert.deepEqual(b.instance,a.instance,id+' Float32 instance rows');assert.equal(b.geometry.index,a.geometry.index);assert.equal(b.geometry.attributes.position,a.geometry.attributes.position);assert.deepEqual(b.sphere,a.sphere,id+' native sorting sphere');for(let i=0;i<16;i++)assert.ok(Math.abs(a.world[i]-b.world[i])<1e-10,id+' actual world transform');}
 const camera=new T.PerspectiveCamera(38,1,.1,1000);camera.position.set(25,-158,170);camera.updateMatrixWorld(true);
 const [oldLods,newLods]=roots.map(rockLods);
 for(const lod of [...oldLods,...newLods])lod.update(camera);
 assert.ok(oldLods.every(lod=>lod.getCurrentLevel()===0),'old empty-centre batch selected near detail for all64');
 assert.ok(newLods.every(lod=>lod.getCurrentLevel()>=1),'no garden is within the near distance of this empty passage');
 for(const lod of newLods){camera.position.copy(lod.position).add(new T.Vector3(0,10,0));camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),0,'nearby stones keep original full detail');camera.position.copy(lod.position).add(new T.Vector3(0,500,0));camera.updateMatrixWorld(true);lod.update(camera);assert.equal(lod.getCurrentLevel(),2);}
 const selector=roots[1].children.find(o=>o.userData.benthicFarSelector);
 camera.position.set(18,14,35);camera.updateMatrixWorld(true);selector.update(camera);assert.equal(selector.getCurrentLevel(),1);
 assert.equal(selector.levels[1].object.children.length,3,'surface/overview retains three original far batches');
 assert.equal(selector.levels[1].object.children.reduce((n,m)=>n+m.count,0),64,'far selection retains every stone');
 camera.position.set(25,-158,170);camera.updateMatrixWorld(true);selector.update(camera);assert.equal(selector.getCurrentLevel(),0);
});
