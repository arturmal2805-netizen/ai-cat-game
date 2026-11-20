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
test('exactly one sealed underwater shell with a neutral base, no equipped interior or interactions',()=>{const root=runSceneSteps(warehouseExteriorSteps());assert.equal(root.userData.exteriorOnly,true);assert.equal(root.userData.interactive,false);assert.equal(root.scale.x,1);const box=new T.Box3().setFromObject(root,true);assert(box.max.y< -80);assert(box.max.x-box.min.x>=WAREHOUSE.platformWidth);assert(root.children.some(m=>m.material?.transparent&&m.material.opacity<.2));assert(root.children.some(m=>m.name.startsWith('Neutral sealed')));});

test('current released paid shore stays supported without changing purchases or saved addresses',async()=>{const {retainedMosaLand}=await import('../public/mosasaur-retained-land.js'),{survivingLegacyShore}=await import('../public/mosasaur-expansion.js');const paid={id:'v11-paid-east-shore',item:'business-hotdog',biome:'autumn',x:375,z:0,readyAt:5000};const zones=retainedMosaLand([paid],[]);assert(zones.some(p=>p.id===paid.id));assert.deepEqual(survivingLegacyShore({x:375,z:0},1.3,zones),{x:375,z:0});const dry=survivingLegacyShore({x:375,z:0},1.3,[]);assert(!expandedWaterContains(dry.x,dry.z,MOSA_SEA,mosaCoastFactor));assert(Math.hypot(dry.x,dry.z)<397.7);});

test('expanded coast stays clear of every other island and the infinitely extending housing row',()=>{for(let i=0;i<720;i++){const a=i*Math.PI/360,p=expandedCoastPoint(a,MOSA_SEA,mosaCoastFactor,31),wx=p.x-450,wz=p.z+500;assert(wz>96,'clear entire residential row');for(const b of baseline.islands.filter(b=>b.id!=='autumn'))assert(Math.hypot(wx-b.center[0],wz-b.center[1])>(b.radius||11.65)+3,b.id);}});
