import assert from 'node:assert/strict';import test from 'node:test';import * as T from 'three';
import {MOSA_SEA,mosaCoastFactor,mosaBedY} from '../public/mosasaur-data.js';
import {expandedCoastPoint,expandedWaterContains,WAREHOUSE,warehousePlanBounds} from '../public/mosasaur-expansion-data.js';
import {expansionBedY,expandMosaSea,protectedBuildingBed} from '../public/mosasaur-expansion.js';
import {lagoonSteps} from '../public/lagoon.js';import {runSceneSteps} from '../public/scene-tasks.js';import {warehouseExteriorSteps} from '../public/warehouse-exterior.js';
import baseline from '../docs/qa/2026-11-20/v12-analysis/baseline-boxes.json' with {type:'json'};
test('one contiguous expanded basin includes old lake and distant warehouse with real edge gaps',()=>{
 for(let i=0;i<384;i++){const a=i*Math.PI*2/384,old={x:Math.cos(a)*MOSA_SEA.rx*mosaCoastFactor(a),z:Math.sin(a)*MOSA_SEA.rz*mosaCoastFactor(a)},p=expandedCoastPoint(a,MOSA_SEA,mosaCoastFactor);assert(Math.hypot(p.x,p.z)>=Math.hypot(old.x,old.z)-1e-8);}
 const warehouse=warehousePlanBounds();for(const b of Object.values(baseline.buildings)){const gap=warehouse.min[0]-(b.box.max[0]+450);assert(gap>=3*WAREHOUSE.platformWidth,'at least three full platform widths between actual boxes');}
 for(let x=0;x<=WAREHOUSE.x;x+=10)assert(expandedWaterContains(x,WAREHOUSE.z*x/WAREHOUSE.x,MOSA_SEA,mosaCoastFactor,5));
 assert(expansionBedY(WAREHOUSE.x,WAREHOUSE.z)<=WAREHOUSE.y-1.2);assert(WAREHOUSE.y+WAREHOUSE.wallHeight+WAREHOUSE.roofHeight< -80);
});
test('protected old central bed and building approaches retain exact heights',()=>{for(let x=-170;x<=170;x+=17)for(let z=-20;z<299;z+=13)assert.equal(expansionBedY(x,z),mosaBedY(x,z));assert(protectedBuildingBed(0,290));});
test('expansion extends a single released water surface without a shader/material/clock fork',()=>{
 const sea=runSceneSteps(lagoonSteps({rx:MOSA_SEA.rx,rz:MOSA_SEA.rz,depth:200,bedHeight:mosaBedY,coastFactor:mosaCoastFactor,bedResolution:[64,32],surfaceResolution:[64,32],fishCount:0})),material=sea.userData.water,surface=sea.children.find(m=>m.material===material),oldCount=surface.geometry.attributes.position.count,oldPos=surface.geometry.attributes.position.array.slice(),core=[];
 for(let i=0;i<sea.userData.bed.geometry.attributes.position.count;i++){const p=sea.userData.bed.geometry.attributes.position;if(Math.hypot(p.getX(i),p.getY(i))<.5)core.push([i,p.getZ(i)]);}
 expandMosaSea(sea);assert.equal(sea.children.filter(m=>m.material===material).length,1);assert.equal(surface.material,material);assert(surface.geometry.attributes.position.count>oldCount);assert.deepEqual(surface.geometry.attributes.position.array.slice(0,oldPos.length),oldPos);for(const[i,y]of core)assert.equal(sea.userData.bed.geometry.attributes.position.getZ(i),y);assert(!sea.children.some(m=>m.geometry?.type==='CylinderGeometry'));
 for(const m of [surface,sea.userData.bed])assert(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));
});
test('exactly one sealed underwater shell with a neutral base, no equipped interior or interactions',()=>{const root=runSceneSteps(warehouseExteriorSteps());assert.equal(root.userData.exteriorOnly,true);assert.equal(root.userData.interactive,false);assert.equal(root.scale.x,1);const box=new T.Box3().setFromObject(root,true);assert(box.max.y< -80);assert(box.max.x-box.min.x>=264);assert(root.children.some(m=>m.material?.transparent&&m.material.opacity<.2));assert(root.children.some(m=>m.name.startsWith('Neutral sealed')));});
