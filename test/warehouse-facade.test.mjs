import test from'node:test';import assert from'node:assert/strict';import * as T from'three';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import baseline from'./fixtures/warehouse-b995-baseline.json'with{type:'json'};import{warehouseExteriorSteps}from'../public/warehouse-exterior.js';import{runSceneSteps}from'../public/scene-tasks.js';import{WAREHOUSE as W,WAREHOUSE_REEFS,warehousePlanBounds,expandedWaterContains}from'../public/mosasaur-expansion-data.js';import{MOSA_SEA,mosaCoastFactor}from'../public/mosasaur-data.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
test('approved glass shell retains its topology and additional 3x width/height with unchanged depth and clear underwater approach',()=>{
 const root=runSceneSteps(warehouseExteriorSteps()),glass=root.children.find(o=>o.name.startsWith('Continuous watertight')),p=glass.geometry.attributes.position.array;
 assert.deepEqual(root.position.toArray(),[3520,-453,450]);assert.deepEqual(root.scale.toArray(),[1,1,1]);assert.equal(W.width,3600);assert.equal(W.depth,240);assert.equal(W.heightScale,7.5);assert.equal(p.length,baseline.glazing.length);assert.equal(digest(new Uint8Array(glass.geometry.index.array.buffer)),baseline.indicesSha256);
 for(let i=0;i<p.length;i+=3){assert(Math.abs(p[i]-baseline.glazing[i]*7.5)<.001);assert(Math.abs(p[i+1]+glass.position.y-(.86+(baseline.glazing[i+1]-.86)*7.5))<.001);assert.equal(p[i+2],baseline.glazing[i+2]);}
 const box=new T.Box3().setFromObject(root,true),old=baseline.bounds;assert(Math.abs((box.max.x-box.min.x)/(old.max[0]-old.min[0] )-7.5)<.001);assert(Math.abs((box.max.y-box.min.y)/(old.max[1]-old.min[1] )-7.5)<.001);assert(Math.abs((box.max.z-box.min.z)-(old.max[2]-old.min[2]))<.001);assert(box.max.y< -30);const plan=warehousePlanBounds();for(let i=0;i<3;i++){assert(plan.min[i]<=[box.min.x,box.min.y,box.min.z][i]);assert(plan.max[i]>=[box.max.x,box.max.y,box.max.z][i]);}
 // Navigation boundaries are explicitly extended to the common lagoon in the
 // subsequent open-water request; its dedicated movement/save tests cover them.
 // The later toolbar-latency request authorizes camera/controller changes.
 // Keep authored building models, geometry, economy and save sources frozen;
 // exact camera bounds/framing and pending-request ownership have dedicated
 // warehouse-camera and native venue regressions. Preserve historical fixtures.
 for(const[path,hash]of Object.entries(baseline.protectedFiles).filter(([p])=>!['public/mosasaur-water-probe-assets.js','public/mosasaur-expansion-data.js','public/mosasaur-expansion.js','public/ocean-water-domain.js','public/ocean-swimmer.js','public/submarine-physics.js','public/mall-world.js','public/resort-spa-world.js','public/warehouse-camera.js'].includes(p)))assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),hash,path);
});
test('architectural facade uses static shared batches without adding an interior, interactions or dynamic lights',()=>{
 const root=runSceneSteps(warehouseExteriorSteps());assert.deepEqual(root.userData.facade,{version:2,wallPanelCount:20,lanternCount:12,portalLayers:4,roofSecondaryRibs:16,interiorAdded:false});assert.equal(root.userData.interiorEquipped,false);assert.equal(root.userData.interactive,false);
 let meshes=0,triangles=0;root.traverse(o=>{assert(!o.isLight);if(o.isMesh){meshes++;triangles+=o.geometry.index?.count/3||o.geometry.attributes.position.count/3;assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}});assert(meshes<=12);assert(triangles<150000);
 const mats=new Set(root.children.filter(o=>o.isMesh).map(o=>o.material)),counts=new Map();for(const m of mats)m.addEventListener('dispose',()=>counts.set(m,(counts.get(m)||0)+1));root.userData.dispose();for(const m of mats)assert.equal(counts.get(m),1,'shared materials disposed once');
});
test('only the two covered Warehouse garden pockets move clear of the enlarged foundation; counts and other addresses survive',()=>{
 const old=[[1495,855],[1750,60],[2140,75],[2605,315],[2575,750],[2200,885],[1345,525],[2785,570]];assert.equal(WAREHOUSE_REEFS.length,8);
 for(const[p,i]of WAREHOUSE_REEFS.map((p,i)=>[p,i])){assert.equal(p.x,old[i][0]);if(![3,7].includes(i))assert.equal(p.z,old[i][1]);const dx=Math.max(0,Math.abs(p.x-W.x)-W.platformWidth/2),dz=Math.max(0,Math.abs(p.z-W.z)-W.platformDepth/2);assert(Math.hypot(dx,dz)>p.radius+63);
  if([3,7].includes(i))for(let j=0;j<32;j++)assert(expandedWaterContains(p.x+Math.cos(j*Math.PI/16)*63,p.z+Math.sin(j*Math.PI/16)*63,MOSA_SEA,mosaCoastFactor),'relocated garden remains within common lagoon');
 }
});
test('Warehouse illumination keeps global ocean fog and glazing untouched and adds no texture or dynamic-light pass',()=>{
 const original=T.ShaderChunk.fog_fragment,root=runSceneSteps(warehouseExteriorSteps()),gold=root.children.find(o=>o.name.startsWith('gold structure')),glass=root.children.find(o=>o.name.startsWith('Continuous watertight'));const shader={fragmentShader:'#include <fog_fragment>'};gold.material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('min( fogFactor, 0.32 )'));assert.equal(T.ShaderChunk.fog_fragment,original);assert.equal(glass.material.opacity,.14);assert(!shader.fragmentShader.includes('sampler'));
});
