import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import * as T from 'three';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';import {SHOWCASE_WATER_PROBES,SHOWCASE_PROBE_REVISION} from '../public/showcase-probe-assets.js';import {PROBE_INPUTS} from '../scripts/showcase-probe-inputs.mjs';
import {waterMaterial} from '../public/water-shading.js';import {polishShowcaseWater,submergeReceivingFloor,submergeReceivingWalls,receivingBankEnd,showcaseBasinGrid,detailShowcaseBasin,receivingRailPoint} from '../public/showcase-water-optics.js';import {receivingPool} from '../public/reference-slide-assets.js';import {createShowcaseRoute} from '../public/showcase-water-motion.js';

test('all eight original mini-biomes have versioned 256-square static reflections matching the current scenery inputs',async()=>{
 assert.deepEqual(Object.keys(SHOWCASE_WATER_PROBES).sort(),SHOWCASE_WATER_RIDES.map(s=>s.id).sort());let bytes=0;
 for(const url of Object.values(SHOWCASE_WATER_PROBES)){const png=await readFile(new URL('../public/'+url,import.meta.url));assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),256);assert.ok(url.includes(createHash('sha256').update(png).digest('hex').slice(0,12)));bytes+=png.length;}
 assert.ok(bytes<1500000);const h=createHash('sha256');for(const f of PROBE_INPUTS)h.update(f).update(await readFile(new URL('../public/'+f,import.meta.url)));assert.equal(SHOWCASE_PROBE_REVISION,h.digest('hex').slice(0,16),'rebake after changing original scenery');
});
test('clear blue water keeps the existing wave/impact fields and single reflection lookup; other native water remains unchanged',()=>{
 const original=waterMaterial(),snapshot=original.fragmentShader,material=waterMaterial(0x40d5e6,.79,{flow:{speed:8,width:13}}),field=material.uniforms.uWaterField.value,ripples=material.uniforms.uRipples.value,oldLookups=(material.fragmentShader.match(/texture2D\(/g)||[]).length;
 polishShowcaseWater(material,SHOWCASE_WATER_RIDES[2]);assert.equal(material.uniforms.uWaterField.value,field);assert.equal(material.uniforms.uRipples.value,ripples);assert.equal((material.fragmentShader.match(/texture2D\(/g)||[]).length,oldLookups);
 assert.ok(material.uniforms.uColor.value.b>material.uniforms.uColor.value.g);assert.equal(original.fragmentShader,snapshot);assert.equal(original.userData.showcaseOptics,undefined);
 const once=material.fragmentShader;polishShowcaseWater(material);assert.equal(material.fragmentShader,once);assert.equal(material.depthWrite,false);assert.equal(material.forceSinglePass,true);
});
test('receiving floors/walls meet the real basin bed while the dry rim stays intact and the rapids bank ends at its shore',()=>{
 const pool=[0,35,22,15],surface=1.45,g=new T.BufferGeometry(),before=[0,1.22,35, 0,3.82,35, 0,1.22,10, 0,3.82,10];g.setAttribute('position',new T.Float32BufferAttribute(before,3));g.setIndex([0,1,2,1,3,2]);const rim=g.attributes.position.getY(3);
 submergeReceivingWalls(g,pool,surface);assert.ok(g.attributes.position.getY(1)<surface-.9);assert.equal(g.attributes.position.getY(3),rim);assert.ok([...g.attributes.normal.array].every(Number.isFinite));
 const floor=new T.PlaneGeometry(1,1);floor.rotateX(-Math.PI/2);floor.translate(0,1.22,35);submergeReceivingFloor(floor,pool,surface);assert.ok(floor.attributes.position.getY(0)<surface-.9);
 const s=SHOWCASE_WATER_RIDES.find(s=>s.kind==='canyon-rafting'),route=createShowcaseRoute(s),data=route.geometry[0],end=receivingBankEnd(data,s.radius,pool,surface);assert.ok(end>.65&&end<.955);const p=data.at(end).position;assert.ok(Math.hypot(p[0]/22,(p[2]-35)/15)>.8);
 const river=SHOWCASE_WATER_RIDES.find(s=>s.kind==='lazy-river');assert.equal(receivingBankEnd(createShowcaseRoute(river).geometry[0],river.radius,pool,surface),.955);
});
for(const fail of [false,true])test('one selected reflection '+(fail?'fails safely without retrying':'is decoded once and shared by all matching surfaces'),async()=>{
 const old={window:globalThis.window,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap};let calls=0;
 try{globalThis.window={};globalThis.fetch=async()=>{calls++;if(fail)throw Error('offline');return {ok:true,blob:async()=>({})};};globalThis.createImageBitmap=async()=>({width:256,height:256});
  const m=await import('../public/showcase-water-probes.js?test='+fail),id=SHOWCASE_WATER_RIDES[0].id,fallback=m.showcaseWaterProbe(id),p=m.prepareShowcaseWaterProbe(id);assert.equal(p,m.prepareShowcaseWaterProbe(id));assert.equal(await p,!fail);await m.prepareShowcaseWaterProbe(id);assert.equal(calls,1);assert.equal(await m.prepareShowcaseWaterProbe('retired-coaster'),false);assert.equal(calls,1);
  if(fail)assert.equal(m.showcaseWaterProbe(id),fallback);else{assert.notEqual(m.showcaseWaterProbe(id),fallback);assert.equal(m.showcaseWaterProbe(id),m.showcaseWaterProbe(id));assert.equal(m.showcaseWaterProbe(id).colorSpace,T.NoColorSpace);assert.equal(m.showcaseWaterProbe(id).userData.sharedScenery,true);}
 }finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('real basin ripples retain the exact boundary and unit UVs; submerged details keep fixed shared buffers and clock',()=>{
 const spec=SHOWCASE_WATER_RIDES[1],g=showcaseBasinGrid(spec.pool[2],spec.pool[3]),p=g.attributes.position;
 assert.equal(p.count,1601);assert.equal(g.index.count/3,3100);for(let i=0;i<p.count;i++){assert.ok(Math.hypot(p.getX(i)/spec.pool[2],p.getZ(i)/spec.pool[3])<=1.000001);assert.ok(g.attributes.normal.getY(i)>.999);}
 const pool=detailShowcaseBasin(receivingPool(spec)),stones=pool.userData.showcaseBasin.stones,positions=stones.instanceMatrix.array.slice(),version=stones.instanceMatrix.version;
 assert.equal(stones.count,24);assert.equal(stones.material.userData.waterLight.clock,pool.userData.water.uniforms.uTime);assert.equal(stones.material.userData.waterLight.level,pool.userData.bed.material.userData.waterLight.level);
 for(let i=0;i<24;i++)assert.ok(stones.instanceMatrix.array[i*16+13]+.25<.155-.7,'all stones stay submerged and below rafts');
 for(let t=0;t<100;t++)pool.userData.update(t,false);assert.deepEqual(stones.instanceMatrix.array,positions);assert.equal(stones.instanceMatrix.version,version);assert.equal(detailShowcaseBasin(pool),pool);
 const peer=detailShowcaseBasin(receivingPool(spec));assert.equal(peer.userData.showcaseBasin.stones.geometry,stones.geometry);
});
test('finite outlet rails descend continuously under the receiving bed rather than ending suspended in air',()=>{
 for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec);for(const data of route.geometry){if(data.closed||data.surf||data.rapids||data.river||data.carousel||data.barrel)continue;for(const side of [-1,1]){
  const points=data.samples.map(s=>receivingRailPoint(s,side,spec.radius,spec.radius,route.pool,spec.surfaceY));assert.ok(points.every(p=>p.toArray().every(Number.isFinite)));assert.ok(points.slice(1).every((p,i)=>p.distanceTo(points[i])<5));
  const last=points.at(-1),r=Math.hypot((last.x-route.pool[0])/route.pool[2],(last.z-route.pool[1])/route.pool[3]);if(r<.68)assert.ok(last.y<=spec.surfaceY-1.4);
 }}}
});
