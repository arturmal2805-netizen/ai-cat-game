import test from 'node:test';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{readFileSync}from'node:fs';
import baseline from './fixtures/mosa-three-rocks-baseline.json' with{type:'json'};
import {MOSA_REEF_INSTANCES,MOSA_ACTIVE_REEF_INSTANCES,MOSA_REMOVED_REEF_IDS,mosaReefClearance,mosaActiveReefClearance,reefSolidDistance}from'../public/mosasaur-reef-data.js';
import{mosaRockReefSteps}from'../public/mosasaur-rock-reefs.js';import{runSceneSteps}from'../public/scene-tasks.js';import{mosaCoralSites,visibleMosaCoralSites}from'../public/mosasaur-corals.js';import{createOceanSwimmer}from'../public/ocean-swimmer.js';import{normalizeSubmarine}from'../public/submarine-physics.js';import{expansionBedY}from'../public/mosasaur-expansion.js';import{mosaBedY,MOSA_SEA}from'../public/mosasaur-data.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('only the three circled east-side reef instances are omitted; remaining positions/forms and every building stay unchanged',()=>{
 assert.deepEqual(MOSA_REMOVED_REEF_IDS,['reef-terrace-0','reef-terrace-1','reef-terrace-11']);assert.deepEqual(MOSA_REEF_INSTANCES,baseline.reefs);assert.equal(MOSA_ACTIVE_REEF_INSTANCES.length,9);
 const model=runSceneSteps(mosaRockReefSteps());assert.equal(model.children.length,9);assert.deepEqual(model.userData.instances.map(c=>c.id),MOSA_ACTIVE_REEF_INSTANCES.map(c=>c.id));
 for(const[p,digest]of Object.entries(baseline.protectedFiles))assert.equal(hash(readFileSync(new URL('../'+p,import.meta.url))),digest,p);
});
test('manual swimming and restored submarine poses can occupy and cross the deleted rock volumes without ghost contacts',()=>{
 for(const id of MOSA_REMOVED_REEF_IDS){const c=MOSA_REEF_INSTANCES.find(c=>c.id===id);let start;
  search:for(const level of [.45,.6,.75])for(const dx of [-.25,0,.25])for(const dz of [-.25,0,.25]){const p={x:c.x+dx*c.radius,y:c.base+(c.top-c.base)*level,z:c.z+dz*c.radius,yaw:Math.PI,active:true};
   if(reefSolidDistance(c,p.x,p.y,p.z)>-2||p.y<expansionBedY(p.x,p.z)+4||Math.hypot(p.x/(MOSA_SEA.rx-4),p.z/(MOSA_SEA.rz-4))>.98||mosaActiveReefClearance(p.x,p.y+.7,p.z)<4)continue;
   const swimmer=createOceanSwimmer(p,{obstacles:[]});if(!swimmer.clear(p)||!normalizeSubmarine(p).active)continue;start=p;break search;
  }
  assert(start,id+' has a real clear water pose inside its former mesh');assert(mosaReefClearance(start.x,start.y,start.z)<0);const swimmer=createOceanSwimmer(start,{obstacles:[]});for(let i=0;i<30;i++)swimmer.step(1/60,{forward:1});assert(Math.hypot(swimmer.state.x-start.x,swimmer.state.z-start.z)>4,id+' no invisible wall');assert(normalizeSubmarine({...swimmer.state,active:true}).active);
 }
});
test('authored flora remains byte-identical; only colonies without a surviving rock/floor support disappear',()=>{
 const raw=mosaCoralSites(),visible=visibleMosaCoralSites(),ids=new Set(visible.map(p=>p.id));assert.equal(hash(JSON.stringify(raw)),baseline.authoredCoralSha256);assert.equal(raw.length,1024);assert.equal(visible.length,858);
 for(const p of raw){const supported=Math.abs(p.y-mosaBedY(p.x,p.z))<.15||Math.abs(mosaActiveReefClearance(p.x,p.y,p.z))<.15;assert.equal(ids.has(p.id),supported);if(ids.has(p.id))assert.equal(visible.find(v=>v.id===p.id),p);}
});

test('cached optical depth omits the removed trio while retaining the complete authored flora cache',async()=>{
 const {decodeSceneryGeometries}=await import('../public/scenery-geometry-codec.js'),{MOSA_REEF_URL}=await import('../public/mosasaur-reef-manifest.js'),{MOSA_REEF_REVISION}=await import('../public/mosasaur-reef-sculpt.js'),{mosaActiveReefSurfaceY,MOSA_OPTICAL_GRID_SIZE:n,MOSA_OPTICAL_GRID_EXTENT:e}=await import('../public/mosasaur-reef-data.js');
 const bytes=readFileSync(new URL('../public/'+MOSA_REEF_URL.slice(2),import.meta.url)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{extras}=await decodeSceneryGeometries(buffer,MOSA_REEF_REVISION,[]);
 for(const id of MOSA_REMOVED_REEF_IDS){const c=MOSA_REEF_INSTANCES.find(c=>c.id===id),x=Math.round((c.x/e*.5+.5)*(n-1)),z=Math.round((c.z/e*.5+.5)*(n-1));assert.equal(extras.opticalFloor.array[z*n+x],Math.fround(mosaActiveReefSurfaceY((x/(n-1)*2-1)*e,(z/(n-1)*2-1)*e)));}
 assert.equal(extras.coralSites.count,10240);
});
