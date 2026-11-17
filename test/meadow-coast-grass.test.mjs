import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {coastGrassCellSteps,createCoastMeadowGrass} from '../public/meadow-coast-grass.js';
import {createMeadowGrassResources} from '../public/meadow-patch.js';import {coastMeadowCover} from '../public/meadow-coast-field.js';import {runSceneSteps,prepareSceneSteps} from '../public/scene-tasks.js';import {disposeScenery} from '../public/scenery-models.js';
function hash(root){const h=createHash('sha256');for(const level of root.levels){const g=level.object.geometry;if(!g)continue;for(const attribute of Object.values(g.attributes))h.update(Buffer.from(attribute.array.buffer));h.update(Buffer.from(g.index.array.buffer));}return h.digest('hex');}
test('real cell clumps rebuild identically after eviction, respect soil and paid placement clearance, and contain dense low grass',()=>{
 const resources=createMeadowGrassResources();resources.material.userData.sharedScenery=true;const cell={key:'52:-4',x:364,z:-28,size:7},clear=(x,z)=>Math.hypot(x-368,z+25)>1.5;
 const a=runSceneSteps(coastGrassCellSteps(cell,resources,clear)),b=runSceneSteps(coastGrassCellSteps(cell,resources,clear));assert.ok(a.userData.meadowInstances>150);assert.equal(hash(a),hash(b));
 for(const level of a.levels){const g=level.object.geometry;if(!g)continue;const poses=g.attributes.meadowPose;for(let i=0;i<g.instanceCount;i++){const x=poses.getX(i)+a.position.x,z=poses.getY(i)+a.position.z;assert.ok(clear(x,z));assert.ok(coastMeadowCover(x,z).soil<.40001);}}
 disposeScenery(a);disposeScenery(b);resources.near.dispose();resources.mid.dispose();resources.material.dispose();
});
test('stream teardown aborts actual cooperative cells and cannot reveal late models',async()=>{
 const root=createCoastMeadowGrass(),warm=[];
 root.userData.configureMeadow({prepare:(steps,{signal})=>prepareSceneSteps(steps,{signal,budget:0,yieldTask:()=>new Promise(setImmediate)}),warm:async(model,{needed})=>{warm.push(needed());},onModel:()=>{}});
 root.userData.updateView({x:368,y:2,z:-25},true);assert.equal(root.userData.meadowState().pending,2);root.userData.dispose();root.userData.dispose();
 for(let i=0;i<8;i++)await new Promise(setImmediate);
 assert.equal(root.children.length,0);assert.equal(root.userData.meadowState().pending,0);assert.equal(root.userData.meadowState().failures,0);assert.deepEqual(warm,[]);
});
