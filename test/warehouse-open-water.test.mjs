import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import * as T from 'three';
import baseline from './fixtures/warehouse-f289-water.json' with {type:'json'};
import {expandedCoastSamples,expandedWaterContains,WAREHOUSE,WAREHOUSE_REEFS} from '../public/mosasaur-expansion-data.js';
import {MOSA_SEA,mosaCoastFactor} from '../public/mosasaur-data.js';import {expandMosaSea,expansionBedY} from '../public/mosasaur-expansion.js';import {lagoonSteps} from '../public/lagoon.js';import {runSceneSteps} from '../public/scene-tasks.js';import {warehouseHabitatSteps} from '../public/warehouse-habitat.js';import {createOceanSwimmer} from '../public/ocean-swimmer.js';import {createSubmarinePhysics,normalizeSubmarine} from '../public/submarine-physics.js';import {normalizeOceanExplorer} from '../public/ocean-explorer-state.js';import {oceanWaterContains,constrainOceanWater} from '../public/ocean-water-domain.js';
const coast=expandedCoastSamples(MOSA_SEA,mosaCoastFactor,0,768);
function crossSection(points,x){const z=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if((a.x<=x&&b.x>x)||(b.x<=x&&a.x>x))z.push(a.z+(b.z-a.z)*(x-a.x)/(b.x-a.x));}return[Math.min(...z),Math.max(...z)];}
test('both Warehouse banks widen, previous water remains and all building sources/coordinates stay frozen',()=>{
 assert.deepEqual(WAREHOUSE,baseline.warehouse);assert.deepEqual(WAREHOUSE_REEFS,baseline.reefs);
 for(const[path,hash]of Object.entries(baseline.protectedFiles)){if(['public/ocean-swimmer.js','public/submarine-physics.js'].includes(path))continue;assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);}
 for(const x of [1750,2200,2600]){const old=crossSection(baseline.coast,x),now=crossSection(coast,x);assert(now[0]<old[0]-75,'north bank gives at least 75m more room');assert(now[1]>old[1]+180,'south bank gives at least 180m more room');}
 for(const p of baseline.coast)assert(expandedWaterContains(p.x,p.z,MOSA_SEA,mosaCoastFactor,-.1),'never shrink previously published water');
});
test('all eight marked mounds and 72 crown rocks are absent from the actual mesh; living seabed gardens survive',()=>{
 const sea=runSceneSteps(lagoonSteps({rx:MOSA_SEA.rx,rz:MOSA_SEA.rz,depth:200,bedHeight:expansionBedY,coastFactor:mosaCoastFactor,bedResolution:[364,228],surfaceResolution:[272,184],fishCount:0}));expandMosaSea(sea);sea.updateMatrixWorld(true);const bed=sea.userData.bed;
 for(const[p,i]of WAREHOUSE_REEFS.map((p,i)=>[p,i])){assert(expansionBedY(p.x,p.z)<baseline.reefHeights[i]-75);const ray=new T.Raycaster(new T.Vector3(p.x,5,p.z),new T.Vector3(0,-1,0)),hit=ray.intersectObject(bed,true)[0];assert(hit);assert(Math.abs(hit.point.y-expansionBedY(p.x,p.z))<.3,'real rendered floor follows the clear physical bed');}
 const habitat=runSceneSteps(warehouseHabitatSteps());assert.equal(habitat.userData.colonies,384);assert.equal(habitat.userData.fishCount,60);assert.equal(habitat.userData.raisedMounds,0);assert.equal(habitat.userData.crownBoulders,0);habitat.traverse(o=>assert(!o.name.startsWith('Embedded reef pocket')));
});
test('real swimmer/submarine sweep through every former mound with full scenery obstacles, and reject the new outer bank',()=>{
 for(const p of WAREHOUSE_REEFS){const raw={x:p.x-20,y:-135,z:p.z,yaw:Math.PI/2,mode:'swimming',floor:0,returning:false},swimmer=createOceanSwimmer(raw);assert(swimmer.clear(raw));for(let i=0;i<40;i++)swimmer.step(.1,{forward:1});assert(swimmer.state.x>p.x+20,'cross full removed mound centre without a ghost obstacle');assert.equal(normalizeOceanExplorer(swimmer.state).mode,'swimming');
 const sub=createSubmarinePhysics({...raw,active:true,mode:'chase'});assert(sub.state.active);for(let i=0;i<25;i++)sub.step(.1,{forward:1});assert(sub.state.x>p.x+10);assert(normalizeSubmarine(sub.snapshot()).active);}
 const old=[0,0];assert(oceanWaterContains(...old,4));const p={x:10000,z:10000};assert(!oceanWaterContains(p.x,p.z,4));assert(constrainOceanWater(p,4));assert(oceanWaterContains(p.x,p.z,3.9));assert(!oceanWaterContains(NaN,0));assert.throws(()=>normalizeOceanExplorer({mode:'swimming',x:10000,y:-100,z:10000,yaw:0}));
});
