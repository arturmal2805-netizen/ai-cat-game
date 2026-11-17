import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {runSceneSteps} from '../public/scene-tasks.js';
import {mosaSeabedPatchSteps,seabedPatchSites} from '../public/mosasaur-seabed-patch.js';
import {SEABED_REEF_PATCH as P,seabedPatchMask} from '../public/mosasaur-seabed-patch-data.js';
import {mosaBedY} from '../public/mosasaur-data.js';
import {mosaCoralSites} from '../public/mosasaur-corals.js';
import {sandDetailTexture} from '../public/mosasaur-sand-detail.js';
test('bounded mixed reef preserves original colonies, actual floor support and a body-width sand passage',()=>{
 const original=mosaCoralSites(),snapshot=JSON.stringify(original);
 const a=runSceneSteps(seabedPatchSites(P.corals,7319,true)),b=runSceneSteps(seabedPatchSites(P.corals,7319,true));
 assert.deepEqual(a,b);assert.equal(a.length,64);assert.equal(new Set(a.map(p=>p.form)).size,9);
 for(const p of a){assert.ok(seabedPatchMask(p.x,p.z)>0);assert.ok(Math.abs(p.y-mosaBedY(p.x,p.z)-.025)<1e-9);assert.ok(Math.abs(p.x-P.x-1.5*Math.sin((p.z-P.z)*.23))>2.6);assert.ok(Math.abs(Math.hypot(p.nx,p.ny,p.nz)-1)<1e-10);}
 assert.equal(JSON.stringify(mosaCoralSites()),snapshot);assert.equal(original.length,1024);
});
test('curved seagrass retains every plant at all LODs and never rewrites instance rows during animation',()=>{
 const root=runSceneSteps(mosaSeabedPatchSteps());assert.equal(root.userData.plants.length,1024);
 const groups=root.children.filter(o=>o.isLOD);assert.equal(groups.length,4);
 for(let level=0;level<3;level++)assert.equal(groups.reduce((n,g)=>n+g.levels[level].object.count,0),1024);
 const matrices=groups.map(g=>g.levels[0].object.instanceMatrix),versions=matrices.map(b=>b.version),bytes=matrices.map(b=>b.array.slice());
 for(let t=0;t<100;t++)root.userData.update(t,false);
 for(const [i,b]of matrices.entries()){assert.equal(b.version,versions[i]);assert.deepEqual(b.array,bytes[i]);for(const l of groups[i].levels)assert.equal(l.object.instanceMatrix,b);}
 root.userData.update(20,true);
});
test('authored sand relief is a shared linear GL-normal/roughness map, not a colour photograph',()=>{
 const a=sandDetailTexture();assert.equal(a,sandDetailTexture());assert.equal(a.colorSpace,T.NoColorSpace);assert.equal(a.image.width,256);
 const b=a.image.data;for(let k=0;k<b.length;k+=4){const length=Math.hypot(b[k]/127.5-1,b[k+1]/127.5-1,b[k+2]/127.5-1);assert.ok(Math.abs(length-1)<.012);assert.ok(b[k+3]>=215&&b[k+3]<=241);}
});
