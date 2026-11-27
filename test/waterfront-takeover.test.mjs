import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWaterfrontRuntime} from '../public/waterfront-runtime.js';
import {WATERFRONT as W} from '../public/waterfront-data.js';
import {trampolineSteps,netDisplacement} from '../public/waterfront-trampoline.js';
import {runSceneSteps} from '../public/scene-tasks.js';
function fixture(activity='waterfront-bounce'){
 const actor={id:'chichi',position:new T.Vector3(W.trampoline.x,W.trampoline.y+.012,W.trampoline.z-48),radius:.6},splashes=[];
 const root=runSceneSteps(trampolineSteps(new T.Group(),Object.fromEntries(['violet','rose','gold','light','pink','ivory'].map(k=>[k,new T.MeshStandardMaterial()]))));
 const r=createWaterfrontRuntime({origin:{x:0,z:0},getActors:()=>[actor],getTrampoline:()=>root,effects:{splash:(...a)=>splashes.push(a)}});
 assert(r.start('chichi',activity));return{r,root,splashes};
}
function until(r,predicate,limit=40000){for(let i=0;i<limit;i++){r.update(1/120,r.clock+1/120);if(predicate(r.get('chichi')))return;}assert.fail('phase never reached');}
test('ordinary trampoline invitation grows every hop and then really dives, splashes, swims and climbs',()=>{
 const {r,splashes}=fixture();const phases=new Set(),hops=[];let last='';
 until(r,v=>{if(!v)return true;phases.add(v.phase);if(v.phase==='bounce'&&last!=='bounce')hops.push(v.launchHeight);last=v.phase;return false;});
 assert.equal(hops.length,4);for(let i=1;i<hops.length;i++)assert(hops[i]>hops[i-1]);
 for(const p of ['dive','splash','swim','climb','shake'])assert(phases.has(p),p);assert(splashes.some(s=>s[3]>2));
});
test('manual takeover remains owned through approach, airborne, return and water recovery',()=>{
 for(const [activity,phase] of [['waterfront-bounce','approach'],['waterfront-bounce','bounce'],['waterfront-bounce','return'],['waterfront-dive','dive'],['waterfront-dive','swim']]){
  const {r}=fixture(activity);until(r,v=>v?.phase===phase);
  assert(r.requestPlayer());const before=r.frame('chichi').position.clone();assert(r.requestPlayer(),'repeated request is idempotent');assert(r.frame('chichi').position.equals(before));
  until(r,v=>v?.phase==='player');assert(r.ownsPlayer);assert(r.has('chichi'));
  r.playerInput({jump:true,forward:0,side:0,heading:0});until(r,v=>v?.phase==='bounce');assert(r.get('chichi').launchHeight>0);
 }
});
test('first launch visibly loads the net, pins its perimeter and retains CPU contact',()=>{
 const {r,root}=fixture();let deepest=0;until(r,v=>{if(v?.phase==='compress')deepest=Math.min(deepest,v.local.y-W.trampoline.y-.012);return v?.phase==='bounce';});
 assert(deepest<-.4,'first hop bends the actual shared field by at least 40cm');
 assert.equal(netDisplacement(68,0,r.clock,[new T.Vector4(62,0,-1,0)]),0,'anchored rim cannot flap freely');
 assert(root.userData.net.geometry.boundingBox.min.y<=deepest);
});
