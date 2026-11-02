import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {zooAnimals,zooJointPoint,zooAnimalVertex} from '../public/zoo-animals.js';
import {ZOO_EXHIBITS} from '../public/zoo-data.js';
import {ELEPHANT_TRUNK_TIP} from '../public/zoo-elephant-data.js';
import {ELEPHANT_FAMILY_DELAY,ELEPHANT_FAMILY_SECONDS} from '../public/zoo-elephant-family.js';
import {encodeZooTemplate,decodeZooTemplate} from '../public/zoo-model-codec.js';

test('two differently sized adult elephants actually meet trunk tips, retain body clearance and leave their calf independent',()=>{
 const mesh=zooAnimals(ZOO_EXHIBITS.find(e=>e.species==='elephant')),
  time=u=>ELEPHANT_FAMILY_DELAY+u*ELEPHANT_FAMILY_SECONDS,
  tip=i=>zooJointPoint(mesh,'trunk4',i,mesh.userData.uniforms.uZooTime.value,new T.Vector3(),new T.Vector3(...ELEPHANT_TRUNK_TIP));
 try{
  assert.equal(mesh.count,3);assert.equal(mesh.userData.poseData.frameCount,592);
  for(const u of [.37,.43,.5,.6,.68]){
   mesh.userData.update(time(u));const a=tip(0),b=tip(1);
   assert.ok(a.distanceTo(b)<.075,`trunk tips fail to meet at ${u}: ${a.distanceTo(b)}`);
   assert.ok(Math.abs(a.y-2.15)<.035&&Math.abs(b.y-2.15)<.035,'contact is at a shared, raised height');
   assert.ok(mesh.userData.uniforms.uZooOverrideMix.value[0]>.99);assert.equal(mesh.userData.uniforms.uZooOverrideMix.value[2],0);
   const boxes=[new T.Box3(),new T.Box3()],g=mesh.geometry,d=mesh.userData.poseData;
   for(let v=0;v<g.attributes.position.count;v+=7){const role=d.joints[g.attributes.aJoints.getX(v)].role;
    if(role!=='body'&&role!=='head')continue;
    for(let i=0;i<2;i++)boxes[i].expandByPoint(zooAnimalVertex(mesh,v,i,time(u)));
   }
   assert.ok(boxes[1].min.x-boxes[0].max.x>.15,'facing adults must not intersect their bodies');
  }
  let previous;for(let t=ELEPHANT_FAMILY_DELAY-1/60;t<=ELEPHANT_FAMILY_DELAY+ELEPHANT_FAMILY_SECONDS+1/60;t+=1/60){mesh.userData.update(t);const p=tip(0);assert.ok(p.toArray().every(Number.isFinite));if(previous)assert.ok(previous.distanceTo(p)<.12,`family motion has a visible snap at ${t}: ${previous.distanceTo(p)} (origin ${mesh.userData.actors[0].timeOrigin})`);previous=p;}
  const geometry=mesh.geometry,versions=Object.values(geometry.attributes).map(a=>a.version),instanceVersion=mesh.instanceMatrix.version;
  for(let i=0;i<120;i++)mesh.userData.update(time(.5)+i/60);
  assert.deepEqual(Object.values(geometry.attributes).map(a=>a.version),versions);assert.equal(mesh.instanceMatrix.version,instanceVersion);
  // Visiting cats interrupt gently; reduced motion restores ordinary poses.
  mesh.userData.update(time(.5),false,1);assert.ok(mesh.userData.uniforms.uZooOverrideMix.value[0]>.9);
  mesh.userData.update(time(.5)+.7,false,1);assert.equal(mesh.userData.uniforms.uZooOverrideMix.value[0],0);
  mesh.userData.update(time(.63),false,0);assert.equal(mesh.userData.uniforms.uZooOverrideMix.value[0],0,'cancelled pair cannot jump back into the middle of its old greeting');
  mesh.userData.update(time(.5),true);assert.equal(mesh.userData.uniforms.uZooOverrideMix.value[0],0);
  // In the real habitat the calf hosts visitors during the adults' family
  // greeting, so repeated visitor waves cannot starve the family animation.
  mesh.userData.familyVisitorHost=2;mesh.userData.elephantFamilySkippedCycle=null;
  mesh.userData.update(time(.5),false,1);assert.ok(mesh.userData.uniforms.uZooOverrideMix.value[0]>.99);assert.equal(mesh.userData.uniforms.uZooOverrideMix.value[2],0);
  const encoded=encodeZooTemplate(mesh.userData.poseData),decoded=decodeZooTemplate(encoded,'elephant');
  const stale=encoded.slice(0),length=new DataView(stale).getUint32(4,true),header=new TextDecoder().decode(new Uint8Array(stale,8,length)).replace('elephant-skin-v2','elephant-skin-v1');new Uint8Array(stale,8,length).set(new TextEncoder().encode(header));assert.throws(()=>decodeZooTemplate(stale,'elephant'),/Old zoo face/);
  assert.equal(decoded.faceRevision,'elephant-skin-v2');assert.equal(decoded.frameCount,592);assert.deepEqual(decoded.values,mesh.userData.poseData.values);
  decoded.geometry.dispose();decoded.texture.dispose();
 }finally{mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
