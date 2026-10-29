import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {zooBehaviorSample,zooBehaviorFrame,ZOO_ACTION_SECONDS,ZOO_CLIPS} from '../public/zoo-behavior.js';
import {ZOO_EXHIBITS,ZOO_ANIMALS} from '../public/zoo-data.js';import {zooAnimals,zooAnimalVertex} from '../public/zoo-animals.js';
import {createBiomeScene,disposeBiome} from '../public/biome-scenes.js';import {byBiome} from '../public/game-data.js';
const done=m=>{m.dispose();m.geometry.dispose();m.material.dispose();};
test('every animal gets an independent deterministic shuffle of five actions, without daily AI or synchronized fixed loops',()=>{
 for(const {species} of ZOO_EXHIBITS){const duration=ZOO_ACTION_SECONDS[species];assert.equal(ZOO_CLIPS[species].length,5);
  for(let actor=0;actor<ZOO_ANIMALS[species].count;actor++)for(let group=1;group<20;group++){
   const actions=new Set();for(let step=0;step<5;step++){const t=(group*5+step+.4-actor*.213)*duration,a=zooBehaviorSample(species,actor,t);actions.add(a.name);assert.equal(zooBehaviorFrame(species,actor,t),a.frame);assert.ok(Number.isFinite(a.frame)&&a.frame>=0&&a.frame<400);}assert.equal(actions.size,5,species+' omitted an action');
  }
  assert.notDeepEqual(Array.from({length:20},(_,i)=>zooBehaviorSample(species,0,i*duration).frame),Array.from({length:20},(_,i)=>zooBehaviorSample(species,1,i*duration).frame));
 }
});
test('actual skinned vertices remain continuous at randomized action boundaries for every species and resident',()=>{
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),duration=ZOO_ACTION_SECONDS[e.species],count=m.geometry.attributes.position.count,a=new T.Vector3(),b=new T.Vector3();
  for(let actor=0;actor<m.count;actor++)for(let step=2;step<12;step++){
   const t=(step-actor*.213)*duration;for(let i=0;i<count;i+=Math.max(1,Math.floor(count/24))){zooAnimalVertex(m,i,actor,t-.001,a);zooAnimalVertex(m,i,actor,t+.001,b);assert.ok(a.distanceTo(b)<.004,e.species+' jumped across an action boundary');}
  }done(m);
 }
});
test('all six species visibly animate behind unpaid gates; opening a gate preserves their current motion clock',()=>{
 const root=createBiomeScene(byBiome('magic-zoo')),actors=root.userData.zoo.actors;root.userData.setZooState({receipts:{}});root.userData.update(100);root.userData.update(104);
 for(const [id,m] of actors){assert.ok(m.userData.uniforms.uZooTime.value>0,id+' was frozen behind its gate');const p=new T.Vector3(),q=new T.Vector3(),n=m.geometry.attributes.position.count;let moved=false;
  for(let i=0;i<n;i+=Math.max(1,Math.floor(n/30))){zooAnimalVertex(m,i,0,0,p);zooAnimalVertex(m,i,0,4,q);moved||=p.distanceTo(q)>.001;}assert.ok(moved,id+' has no real motion');
 }
 root.userData.setZooState({receipts:{'zoo-axolotl':{}}});root.userData.update(105);assert.equal(actors.get('zoo-axolotl').userData.uniforms.uZooTime.value,5);disposeBiome(root);
});
test('close inspection hides only its gate and restores it, including a purchase while inspecting',async()=>{
 const {zooGate}=await import('../public/zoo-gate.js'),{disposeScenery}=await import('../public/scenery-models.js');
 const a=zooGate(ZOO_EXHIBITS[1]),b=zooGate(ZOO_EXHIBITS[3]);a.userData.setZooInspection(true);assert.equal(a.children[0].visible,false);assert.equal(b.children[0].visible,true);a.userData.setZooState({receipts:{'zoo-axolotl':{openedAt:Date.now()}}});assert.equal(a.children[0].visible,false);a.userData.setZooInspection(false);assert.equal(a.children[0].visible,true);for(const g of [a,b]){g.userData.disposeStaff();disposeScenery(g);}
});
test('cold shared coat textures prepare cooperatively and retain the exact same immutable pixels',async()=>{
 for(const [file,stepsName,getName] of [['zoo-surface.js','zooSurfaceTextureSteps','zooSurfaceTexture'],['zoo-coat-pattern.js','zooTigerCoatSteps','zooTigerCoat']]){
  const m=await import('../public/'+file+'?cooperative-test'),it=m[stepsName]();let r,count=0;do{r=it.next();count++;}while(!r.done);assert.ok(count>50,file+' did not yield during preparation');const v=r.value.version;assert.equal(m[getName](),r.value);assert.equal(r.value.version,v);assert.ok(r.value.image.data.some(x=>x>128));
 }
});
