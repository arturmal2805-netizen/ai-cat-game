import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import scope from '../docs/specifications/warehouse-threefold-2026-11-27.json' with {type:'json'};
import {WAREHOUSE as W,warehousePlanBounds,expandedWaterContains,expandedCoastSamples,expandedOverview} from '../public/mosasaur-expansion-data.js';
import {warehouseExteriorSteps} from '../public/warehouse-exterior.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {MOSA_SEA,mosaCoastFactor} from '../public/mosasaur-data.js';
import {expansionBedY} from '../public/mosasaur-expansion.js';
import {normalizeOceanExplorer} from '../public/ocean-explorer-state.js';
import {normalizeSubmarine} from '../public/submarine-physics.js';
import {createOceanSwimmer} from '../public/ocean-swimmer.js';

test('explicit additional x3 supersedes only Warehouse size and its necessary surrounding geography',()=>{
 const old=scope.previousWarehouse;
 assert.equal(W.width/old.width,3);assert.equal(W.heightScale/old.heightScale,3);
 assert.equal(W.platformWidth/old.platformWidth,3);
 for(const k of ['id','depth','platformDepth','z','exteriorOnly'])assert.equal(W[k],old[k],k);
 for(const [file,hash] of Object.entries(scope.frozenFiles).filter(([f])=>!scope.followupAuthorizedFiles.includes(f)))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
test('the larger native shell stays submerged, embedded and separated by the previous open-water approach',()=>{
 const root=runSceneSteps(warehouseExteriorSteps()),b=new T.Box3().setFromObject(root,true),old=scope.previousWarehouse;
 // Approved previous measured native bounds, rather than a guessed purchase footprint.
 assert(Math.abs((b.max.x-b.min.x)/1323.50048828125-3)<1e-5);
 assert(Math.abs((b.max.y-b.min.y)/143.781463637352-3)<1e-5);
 assert(Math.abs((b.max.z-b.min.z)-297.3999938964844)<.01);
 assert(b.max.y<-30);assert(b.min.x>old.x-old.platformWidth/2-8);
 assert(expansionBedY(W.x,W.z)>b.min.y&&expansionBedY(W.x,W.z)<W.y+.86);
 const plan=warehousePlanBounds();for(let x=plan.min[0];x<=plan.max[0];x+=50)for(const z of [plan.min[2],W.z,plan.max[2]])assert(expandedWaterContains(x,z,MOSA_SEA,mosaCoastFactor,80),'whole shell remains in one basin with shore clearance');
 const overview=expandedOverview();for(const p of expandedCoastSamples(MOSA_SEA,mosaCoastFactor,31,768))assert(Math.hypot(p.x-overview.center[0],p.z-overview.center[2])<overview.radius,'real new coast fits the island overview');
});
test('deep approach/swimming/submarine poses survive normalization below the old -205m cutoff',()=>{
 const x=W.x,z=W.z+W.platformDepth/2+20,y=expansionBedY(x,z)+8;
 assert(y<-400);
 const p={mode:'swimming',x,y,z,yaw:0,active:true};assert(createOceanSwimmer(p).clear(p));
 assert.equal(normalizeOceanExplorer(p).y,y);assert.equal(normalizeSubmarine(p).y,y);
});
