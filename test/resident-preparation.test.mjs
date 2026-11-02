import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareResidentModels} from '../public/resident-preparation.js';
import {activeCats} from '../public/cat-roster.js';
import {catAppearance,ADOPTION_CATS} from '../public/cat-breeds.js';
import {newGame} from '../public/economy.js';
import {BIOMES} from '../public/game-data.js';
import {createCat,disposeCat} from '../public/cat-model.js';
import {enableCatRenderBatch} from '../public/cat-render-batch.js';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createCatPoseAtlas} from '../public/cat-pose-atlas.js';
import {retireGeometryBuffers} from '../public/geometry-residency.js';
function seed(){const g=newGame(1700000000000);g.unlocked=BIOMES.map(b=>b.id);g.adoption.cats=ADOPTION_CATS.slice(0,15).map(c=>({id:c.id,adoptedAt:1700000000000,homeBiome:'moon',centerId:''}));return g;}
test('background startup pauses its remaining model work and resumes without duplicate actors',async()=>{
 let visible=false,built=0;const g=seed(),expected=activeCats(g).filter(p=>!p.homeVenueId).length;
 const pending=prepareResidentModels(g,{canRun:()=>visible,yieldTask:async()=>{},create:()=>{built++;return {};},dispose:()=>{}});
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(built,0);visible=true;const pool=await pending;assert.equal(built,expected);pool.dispose();
});
test('startup constructs at most one exact original rig per browser turn and every prepared actor is consumed once',async()=>{
 const g=seed(),before=structuredClone(g),profiles=activeCats(g).filter(p=>!p.homeVenueId),calls=[],disposed=[],progress=[];let turn=0,time=0;
 const pool=await prepareResidentModels(g,{yieldTask:async()=>{turn++;},clock:()=>time,create:(mood,options)=>{time+=7;calls.push({turn,mood,options});return {turn};},dispose:m=>disposed.push(m),onProgress:(n,total)=>progress.push([n,total])});
 assert.ok(profiles.length>=60);assert.equal(calls.length,profiles.length);assert.equal(new Set(calls.map(c=>c.turn)).size,calls.length);
 for(let i=0;i<profiles.length;i++){assert.equal(calls[i].mood,'happy');assert.deepEqual(calls[i].options,{detail:'npc',...catAppearance(profiles[i])});assert.ok(pool.take(profiles[i]));assert.equal(pool.take(profiles[i]),null);}
 assert.equal(pool.stats.maxTaskMs,7);assert.equal(pool.stats.workMs,profiles.length*7);assert.deepEqual(progress.at(-1),[profiles.length,profiles.length]);pool.dispose();assert.equal(disposed.length,0);assert.deepEqual(g,before);
});
test('a prebuilt native batch binds the real world atlas exactly once and retirement/destruction preserve its normal lifetime',()=>{
 const scene=new THREE.Scene(),atlas=createCatPoseAtlas(scene,new THREE.DirectionalLight(),{sharingEnabled:false}),profile=ADOPTION_CATS[0],cat=createCat('happy',{detail:'npc',...catAppearance(profile)});
 enableCatRenderBatch(cat);const state=cat.userData.renderBatches,buffers=state.batches.map(m=>m.geometry);assert.equal(state.atlas,null);assert.equal(atlas.stats.cats,0);
 cat.scale.setScalar(.63);scene.add(cat);enableCatRenderBatch(cat,atlas);const entries=atlas.stats.entries;assert.ok(entries>0);assert.equal(atlas.stats.cats,1);assert.equal(state.atlas,atlas);assert.ok(state.palettes.every(p=>p.slot));assert.deepEqual(state.batches.map(m=>m.geometry),buffers);
 enableCatRenderBatch(cat,atlas);assert.equal(atlas.stats.entries,entries);assert.equal(atlas.stats.cats,1);
 for(const g of buffers)retireGeometryBuffers(g);assert.equal(atlas.stats.cats,1);assert.equal(atlas.stats.entries,entries);
 disposeCat(cat);assert.equal(atlas.stats.cats,0);assert.equal(atlas.stats.entries,0);atlas.dispose();
});
test('changed appearances, unused rigs and cancelled or failed preparation are safely released',async()=>{
 const g=seed(),profiles=activeCats(g).filter(p=>!p.homeVenueId),disposed=[];
 const pool=await prepareResidentModels(g,{yieldTask:async()=>{},create:()=>({}),dispose:m=>disposed.push(m)});
 assert.equal(pool.take({...profiles[0],eyeColor:0xf00d12}),null);pool.dispose();pool.dispose();assert.equal(disposed.length,profiles.length);
 const abort=new AbortController();let turns=0,created=0,freed=0;
 await assert.rejects(prepareResidentModels(g,{signal:abort.signal,yieldTask:async()=>{if(++turns===4)abort.abort();},create:()=>{created++;return {};},dispose:()=>freed++}),/abort/i);assert.equal(created,3);assert.equal(freed,3);
 created=freed=0;await assert.rejects(prepareResidentModels(g,{yieldTask:async()=>{},create:()=>{if(++created===3)throw Error('fixture failure');return {};},dispose:()=>freed++}),/fixture failure/);assert.equal(freed,2);
});
test('the prepared native rig retains byte-identical mesh attributes, indices, bindings and rest poses',async()=>{
 const g=newGame(1700000000000),profiles=activeCats(g),pool=await prepareResidentModels(g,{yieldTask:async()=>{}}),profile=profiles[0],prepared=pool.take(profile),native=createCat('happy',{detail:'npc',...catAppearance(profile)});native.scale.setScalar(.63*(profile.size||1));enableCatRenderBatch(native);
 function signature(m){const h=createHash('sha256');m.updateMatrixWorld(true);m.traverse(o=>{h.update(o.type);h.update(JSON.stringify(o.matrix.elements));if(o.isMesh){for(const [name,a]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));if(o.isSkinnedMesh){h.update(JSON.stringify(o.bindMatrix.elements));for(const b of o.skeleton.boneInverses)h.update(JSON.stringify(b.elements));}}});return h.digest('hex');}
 assert.equal(signature(prepared),signature(native));disposeCat(prepared);disposeCat(native);pool.dispose();
});
