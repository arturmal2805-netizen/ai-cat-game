import accessScope from '../docs/specifications/warehouse-access-protection-2026-11-27.json' with {type:'json'};
import test from'node:test';import assert from'node:assert/strict';import * as T from'three';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import baseline from'./fixtures/warehouse-b995-baseline.json'with{type:'json'};import{warehouseExteriorSteps}from'../public/warehouse-exterior.js';import{runSceneSteps}from'../public/scene-tasks.js';import{WAREHOUSE as W,WAREHOUSE_REEFS,warehousePlanBounds,expandedWaterContains}from'../public/mosasaur-expansion-data.js';import{MOSA_SEA,mosaCoastFactor}from'../public/mosasaur-data.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
test('approved glass shell retains its topology and additional 3x width/height with requested broader depth and clear approach',()=>{
 const root=runSceneSteps(warehouseExteriorSteps()),glass=root.children.find(o=>o.name.startsWith('Continuous watertight')),p=glass.geometry.attributes.position.array;
 assert.deepEqual(root.position.toArray(),[3520,-453,450]);assert.deepEqual(root.scale.toArray(),[1,1,1]);assert.equal(W.width,3600);assert.equal(W.depth,720);assert.equal(W.heightScale,7.5);assert(p.length>=baseline.glazing.length&&p.length<baseline.glazing.length+240,"entry adds only clipped boundary vertices");
 for(let i=0;i<baseline.glazing.length;i+=3){assert(Math.abs(p[i]-baseline.glazing[i]*7.5)<.001);assert(Math.abs(p[i+1]+glass.position.y-(.86+(baseline.glazing[i+1]-.86)*7.5))<.001);assert(Math.abs(p[i+2]-baseline.glazing[i+2]*3)<.001);}
 const box=(root.updateWorldMatrix(true,true),root.children.filter(o=>o!==root.userData.entry).reduce((b,o)=>b.expandByObject(o,true),new T.Box3())),old=baseline.bounds;assert(Math.abs((box.max.x-box.min.x)/(old.max[0]-old.min[0] )-7.5)<.001);assert(Math.abs((box.max.y-box.min.y)/(old.max[1]-old.min[1] )-7.5)<.001);assert(Math.abs((box.max.z-box.min.z)/(old.max[2]-old.min[2])-3)<.001);assert(box.max.y< -30);const plan=warehousePlanBounds();for(let i=0;i<3;i++){assert(plan.min[i]<=[box.min.x,box.min.y,box.min.z][i]);assert(plan.max[i]>=[box.max.x,box.max.y,box.max.z][i]);}
 // Navigation boundaries are explicitly extended to the common lagoon in the
 // subsequent open-water request; its dedicated movement/save tests cover them.
 // The later toolbar-latency request authorizes camera/controller changes.
 // Keep authored building models, geometry, economy and save sources frozen;
 // exact camera bounds/framing and pending-request ownership have dedicated
 // warehouse-camera and native venue regressions. Preserve historical fixtures.
 for(const[path,hash]of Object.entries(baseline.protectedFiles).filter(([p])=>!accessScope.authorizedFiles.includes(p)&&!['public/mosasaur-water-probe-assets.js','public/mosasaur-expansion-data.js','public/mosasaur-expansion.js','public/ocean-water-domain.js','public/ocean-swimmer.js','public/submarine-physics.js','public/mall-world.js','public/resort-spa-world.js','public/warehouse-camera.js'].includes(p)))assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),hash,path);
});
test('architectural facade uses static shared batches with a separately bounded pressure entry and no equipped interior or dynamic lights',()=>{
 const root=runSceneSteps(warehouseExteriorSteps());assert.deepEqual(root.userData.facade,{version:2,wallPanelCount:20,lanternCount:12,portalLayers:4,roofSecondaryRibs:16,interiorAdded:false});assert.equal(root.userData.interiorEquipped,false);assert.equal(root.userData.interactive,true);
 let meshes=0,triangles=0;root.traverse(o=>{assert(!o.isLight);if(o.isMesh){meshes++;triangles+=o.geometry.index?.count/3||o.geometry.attributes.position.count/3;assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}});assert(root.children.filter(o=>o.isMesh).length<=12);assert(meshes<=32);assert(triangles<150000);
 const mats=new Set(root.children.filter(o=>o.isMesh).map(o=>o.material)),counts=new Map();for(const m of mats)m.addEventListener('dispose',()=>counts.set(m,(counts.get(m)||0)+1));root.userData.dispose();for(const m of mats)assert.equal(counts.get(m),1,'shared materials disposed once');
});
test('existing garden identities and counts survive while covered pockets clear the broadened foundation',()=>{
 const oldX=[1495,1750,2140,2605,2575,2200,1345,2785];assert.equal(WAREHOUSE_REEFS.length,8);
 for(const [i,p]of WAREHOUSE_REEFS.entries()){assert.equal(p.x,oldX[i]);const dx=Math.max(0,Math.abs(p.x-W.x)-W.platformWidth/2),dz=Math.max(0,Math.abs(p.z-W.z)-W.platformDepth/2);assert(Math.hypot(dx,dz)>p.radius+63);for(let j=0;j<32;j++)assert(expandedWaterContains(p.x+Math.cos(j*Math.PI/16)*63,p.z+Math.sin(j*Math.PI/16)*63,MOSA_SEA,mosaCoastFactor),'living garden stays in the common water');}
});
test('Warehouse illumination keeps global ocean fog and glazing untouched and adds no texture or dynamic-light pass',()=>{
 const original=T.ShaderChunk.fog_fragment,root=runSceneSteps(warehouseExteriorSteps()),gold=root.children.find(o=>o.name.startsWith('gold structure')),glass=root.children.find(o=>o.name.startsWith('Continuous watertight'));const shader={fragmentShader:'#include <fog_fragment>'};gold.material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('min( fogFactor, 0.32 )'));assert.equal(T.ShaderChunk.fog_fragment,original);assert.equal(glass.material.opacity,.14);assert(!shader.fragmentShader.includes('sampler'));
});
