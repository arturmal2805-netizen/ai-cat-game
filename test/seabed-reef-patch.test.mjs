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
 const root=runSceneSteps(mosaSeabedPatchSteps({gardens:[P]}));assert.equal(root.userData.plants.length,1024);
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
test('reef gardens span the ocean floor without changing the central ride or the Mall approach',async()=>{
 const {SEABED_REEF_GARDENS:g}=await import('../public/mosasaur-seabed-patch-data.js');
 const ids=new Set();let total=0;
 for(const [i,p]of g.entries()){
  const sites=runSceneSteps(seabedPatchSites(p.corals,7319+i*101,true,p));assert.equal(sites.length,p.corals,'populated garden at '+p.x+','+p.z);
  for(const site of sites){assert.ok(Math.hypot(site.x,site.z)>=28);assert.ok(!(Math.abs(site.x)<80&&site.z>70));assert.ok(Math.abs(site.y-mosaBedY(site.x,site.z)-.025)<1e-9);assert.ok(!ids.has(site.id));ids.add(site.id);}total+=sites.length;
 }
 assert.equal(total,1216);assert.ok(g.some(p=>p.x< -150)&&g.some(p=>p.x>150)&&g.some(p=>p.z< -140)&&g.some(p=>p.z>140));
});
test('expanded coast preserves every published rock/coral vertex and original LOD while regenerating physical site data',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{decodeSceneryGeometries}=await import('../public/scenery-geometry-codec.js'),{MOSA_REEF_URL}=await import('../public/mosasaur-reef-manifest.js');
 const expected=JSON.parse(await readFile(new URL('./fixtures/mosasaur-reef-original-buffers-b805.json',import.meta.url))),bytes=await readFile(new URL('../public/'+MOSA_REEF_URL.slice(2),import.meta.url)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),h=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,new DataView(buffer).getUint32(4,true)))),actual=await decodeSceneryGeometries(buffer,expected.revision,Object.keys(h.models)),hash=a=>createHash('sha256').update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex');
 for(const [name,row]of Object.entries(expected.models)){assert.equal(hash(actual.models[name].index),row.index,name+' original indices');for(const [key,digest]of Object.entries(row.attributes))assert.equal(hash(actual.models[name].attributes[key]),digest,name+' '+key);}
 const {reefFishSchoolStates}=await import('../public/mosasaur-reef-fish.js'),{MOSA_OPTICAL_GRID_SIZE:n,MOSA_OPTICAL_GRID_EXTENT:e,mosaActiveReefSurfaceY:mosaReefSurfaceY}=await import('../public/mosasaur-reef-data.js');
 const sites=Float64Array.from(mosaCoralSites().flatMap((p,i)=>[p.form,p.x,p.y,p.z,p.scale,p.yaw,i,p.nx||0,p.ny??1,p.nz||0])),fish=Float64Array.from([3,7,11].flatMap(index=>reefFishSchoolStates(index).flatMap(s=>[index,s.phase,s.radius,s.cx,s.cz,s.rx,s.rz,s.speed,s.depth,s.scale,s.index])));
 assert.deepEqual(actual.extras.coralSites.array,sites,'offline anchors match the actual expanded physical floor and cliffs');assert.equal(sites.length/10,1024);
 assert.deepEqual(actual.extras.reefFish.array,fish,'school IDs, counts, sizes, clocks and new physical anchors match source');assert.equal(fish.length/11,144);
 const grid=actual.extras.opticalFloor.array;assert.equal(grid.length,n*n);for(const z of [0,Math.floor(n/4),Math.floor(n/2),Math.floor(n*3/4),n-1])for(const x of [0,Math.floor(n/4),Math.floor(n/2),Math.floor(n*3/4),n-1])assert.equal(grid[z*n+x],Math.fround(mosaReefSurfaceY((x/(n-1)*2-1)*e,(z/(n-1)*2-1)*e)),'optical depth follows the same enlarged floor');
 for(let form=0;form<11;form++){const full=actual.models['coral-'+form],far=actual.models['coral-'+form+'-seabed-far'];assert.equal(far.attributes.position,full.attributes.position);assert.ok(far.index.count<=actual.models['coral-'+form+'-far'].index.count);}
});
test('the actual cache loader binds original distant coral levels and separate seabed-only levels',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{prepareMosaReefs}=await import('../public/mosasaur-reef-cache.js'),{borrowedMosaCoralLevels}=await import('../public/mosasaur-corals.js'),expected=JSON.parse(await readFile(new URL('./fixtures/mosasaur-reef-original-buffers-b805.json',import.meta.url))),oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 try{globalThis.window={};globalThis.fetch=async url=>new Response(await readFile(new URL('../public/'+url.slice(2),import.meta.url)));assert.equal(await prepareMosaReefs(),true);
 for(let form=0;form<11;form++){const a=borrowedMosaCoralLevels(form)[2].index.array;assert.equal(createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex'),expected.models['coral-'+form+'-far'].index,'loader preserves original far geometry');}
 }finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
