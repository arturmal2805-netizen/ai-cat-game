import {test} from 'node:test';import assert from 'node:assert/strict';
import {zooAnimalSteps,zooAnimalVertex,zooAnimals} from '../public/zoo-animals.js';
import {ZOO_EXHIBITS} from '../public/zoo-data.js';import {zooSurfaceTexture} from '../public/zoo-surface.js';

test('all six species have continuous weighted sculpts prepared in small cooperative steps',()=>{
 for(const e of ZOO_EXHIBITS){let r,steps=0;const build=zooAnimalSteps(e);do{r=build.next();steps++;}while(!r.done);const m=r.value,d=m.userData.poseData;
  assert.ok(steps>50,e.species+' must yield during sculpt/pose preparation');assert.ok(d.sculptStats.volumes>=8);assert.ok(d.sculptStats.weighted>100,e.species+' needs blended neck/shoulder/ankle skin');assert.ok(d.sculptStats.triangles>3000);
  const g=m.geometry;for(let i=0;i<g.attributes.position.count;i++){const sum=g.attributes.aWeights.getX(i)+g.attributes.aWeights.getY(i);assert.ok(Math.abs(sum-1)<1e-6);assert.ok(Number.isFinite(g.attributes.normal.getX(i)+g.attributes.normal.getY(i)+g.attributes.normal.getZ(i)));}
  const versions=Object.values(g.attributes).map(a=>a.version),instances=m.instanceMatrix.version;for(let t=0;t<32;t+=.1)m.userData.update(t);assert.deepEqual(Object.values(g.attributes).map(a=>a.version),versions);assert.equal(m.instanceMatrix.version,instances);m.dispose();g.dispose();m.material.dispose();
 }
});
test('fur, elephant skin and wet axolotl surface share one immutable filtered texture, without per-frame updates',()=>{
 const texture=zooSurfaceTexture(),version=texture.version;assert.equal(texture.image.width,256);assert.equal(texture.generateMipmaps,true);
 for(const e of ZOO_EXHIBITS){const a=zooAnimals(e);assert.equal(a.userData.uniforms.uZooSurface.value,texture);assert.equal(a.userData.uniforms.uZooSkin.value,['elephant','axolotl'].includes(e.species)?1:0);for(let i=0;i<100;i++)a.userData.update(i*.15);a.dispose();a.geometry.dispose();a.material.dispose();}
 assert.equal(zooSurfaceTexture(),texture);assert.equal(texture.version,version);
});
test('real blended sculpt vertices remain finite through swims, dives, rolls, stretches, climbs and greetings',()=>{
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),count=m.geometry.attributes.position.count;
  for(const time of [0,4,8,12,16,20,24,28,31.999]){m.userData.update(time,false,.8,2);for(let i=0;i<count;i+=Math.max(1,Math.floor(count/160))){const p=zooAnimalVertex(m,i,0,time);assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(Math.hypot(p.x,p.y,p.z)<12,e.species+' vertex escaped enclosure');}}
  m.userData.update(25,true,1,2);assert.equal(m.userData.uniforms.uZooTime.value,0);assert.equal(m.userData.uniforms.uZooAngle.value,0);assert.equal(m.userData.uniforms.uZooGreet.value,0);m.dispose();m.geometry.dispose();m.material.dispose();
 }
});
test('real land paws do not burrow into the floor during the elephant rest and tiger lie-down',()=>{
 for(const [species,time] of [['elephant',25],['tiger',18],['gorilla',0],['polar',28]]){
  const m=zooAnimals(ZOO_EXHIBITS.find(e=>e.species===species)),g=m.geometry,j=m.userData.poseData.joints;let minimum=Infinity;
  for(let i=0;i<g.attributes.position.count;i++)if(j[g.attributes.aJoints.getX(i)].role.startsWith('Leg'))minimum=Math.min(minimum,zooAnimalVertex(m,i,0,time).y);
  assert.ok(minimum>-.05,species+' paw floor clearance '+minimum);m.dispose();g.dispose();m.material.dispose();
 }
});
