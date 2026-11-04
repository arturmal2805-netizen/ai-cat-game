import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createMosaFish,mosaFishFrame,mosaFishStates,fishLocalVertex} from '../public/mosasaur-fish.js';import {mosaBedY,MOSA_SEA} from '../public/mosasaur-data.js';
import {createBiomeScene} from '../public/biome-scenes.js';import {byBiome} from '../public/game-data.js';
test('all 102 original fish keep their scale, clear the physical bed and have individually readable faces',()=>{
 const surface=mosaFishStates(),deep=mosaFishStates(true);assert.equal(surface.length,48);assert.equal(deep.length,54);
 for(const state of [...surface,...deep])for(let t=0;t<180;t+=3.75){const f=mosaFishFrame(state,t);assert.ok(f.y>mosaBedY(f.x,f.z)+.4);assert.ok(f.y<MOSA_SEA.surfaceY);assert.ok(f.scale>=.65&&f.scale<=1.31);}
 const g=createMosaFish(),geo=g.userData.mesh.geometry;assert.ok(geo.attributes.position.count>3000);assert.ok(geo.attributes.position.count<18000);assert.equal(new Set(geo.attributes.aFishPart.array).size,4);assert.ok(geo.attributes.aFishGloss.array.some(x=>x===1));assert.ok(geo.attributes.aFishCoat.array.some(x=>x===0));
 geo.dispose();g.userData.mesh.material.dispose();
});
test('two complete fish schools animate with fixed GPU buffers and normal/reduced CPU pose parity',()=>{
 for(const deep of [false,true]){const g=createMosaFish({deep}),m=g.userData.mesh,version=m.instanceMatrix.version,data=[...m.instanceMatrix.array],geo=m.geometry;
  for(let i=0;i<100;i++)g.userData.update(i,false);assert.equal(m.instanceMatrix.version,version);assert.deepEqual([...m.instanceMatrix.array],data);
  g.userData.update(9,true);const a={...g.userData.frameAt(0)};g.userData.update(80,true);assert.deepEqual(g.userData.frameAt(0),a);assert.equal(a.tail,0);assert.equal(a.fin,0);
  g.userData.update(4,false);assert.notDeepEqual(g.userData.frameAt(0),a);
  const f=g.userData.frameAt(0);for(let i=0;i<geo.attributes.position.count;i+=157){const v=fishLocalVertex(new T.Vector3().fromBufferAttribute(geo.attributes.position,i),geo.attributes.aFishPart.getX(i),f);assert.ok(v.toArray().every(Number.isFinite));}
  assert.ok(m.boundingSphere.radius>0);geo.dispose();m.material.dispose();}
});
test('fish retain the existing bounded response to actual lagoon splashes',()=>{
 const g=createMosaFish(),time=4;g.userData.update(time);const a={...g.userData.frameAt(0)};g.userData.disturb(a.x-.5,a.z,time);const b=g.userData.frameAt(0);assert.ok(b.x>a.x);g.userData.update(time+3);assert.deepEqual(g.userData.frameAt(0),mosaFishFrame(g.userData.states[0],time+3));g.userData.mesh.geometry.dispose();g.userData.mesh.material.dispose();
});
