import {RESORT_ACTIVE_ZONES} from '../public/resort-spa-data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync,gunzipSync} from 'node:zlib';
import * as T from 'three';
import {SPA_PROBE} from '../public/resort-spa-probe-assets.js';
import {unpackSpaProbeSheet,verifySpaProbeBytes} from '../public/resort-spa-probe-data.js';
import {createSpaReflectionLoader,applyResortFinishReflection} from '../public/resort-spa-reflections.js';
import {resortInteriorLighting} from '../public/resort-spa-finishes.js';
import {createMallRoomLights} from '../public/mall-room-light.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('actual shipped reflection sheet decodes byte-identically to all authored native captures, preserving bottom row and linear bytes',async()=>{
 const png=await readFile(new URL('../public/'+SPA_PROBE.url,import.meta.url));assert.equal(sha(png),SPA_PROBE.assetSha256);
 const idat=[];for(let at=8;at<png.length;){const size=png.readUInt32BE(at),type=png.toString('ascii',at+4,at+8);if(type==='IDAT')idat.push(png.subarray(at+8,at+8+size));at+=12+size;}
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20),rows=inflateSync(Buffer.concat(idat)),data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++){assert.equal(rows[y*(width*4+1)],0);data.set(rows.subarray(y*(width*4+1)+1,(y+1)*(width*4+1)),y*width*4);}
 const layers=unpackSpaProbeSheet({data,width,height},SPA_PROBE),native=gunzipSync(await readFile(new URL('probe-layers.rgba.gz',new URL('../'+SPA_PROBE.provenance,import.meta.url))));
 assert.deepEqual(Buffer.from(layers),native);assert.equal(sha(layers),SPA_PROBE.rgbaSha256);await verifySpaProbeBytes(layers,SPA_PROBE.rgbaSha256);
 const m=JSON.parse(await readFile(new URL('../'+SPA_PROBE.provenance,import.meta.url)));
 for(const c of m.captures)assert.equal(sha(layers.subarray(c.layer*128*128*4,(c.layer+1)*128*128*4)),c.rgbaSha256);
 assert.throws(()=>unpackSpaProbeSheet({data,width:width/2,height},SPA_PROBE),/dimensions/);
 await assert.rejects(verifySpaProbeBytes(new Uint8Array([1]),SPA_PROBE.rgbaSha256),/checksum/);
});
test('selected SPA loader coalesces requests and keeps immutable linear layer storage; rejected checksums leave fallback available',async()=>{
 const bytes=new Uint8Array([9]),pixels=new Uint8Array([19,67,203,255,49,157,221,255]),manifest={size:1,layers:2,columns:2,rows:1,assetSha256:sha(bytes),rgbaSha256:sha(pixels),gain:4,revision:'fixture'};let fetches=0,decodes=0,release;const wait=new Promise(r=>release=r);
 const loader=createSpaReflectionLoader({manifest,fetchSheet:async()=>{fetches++;await wait;return bytes;},decodeSheet:async()=>{decodes++;return{data:pixels,width:2,height:1};}});
 assert.equal(loader.get(),null);const a=loader.prepare(),b=loader.prepare();assert.equal(a,b);release();assert.equal(await a,true);assert.equal(fetches,1);assert.equal(decodes,1);
 const {texture}=loader.get();assert(texture.isDataArrayTexture);assert.equal(texture.image.depth,2);assert.deepEqual(texture.image.data,pixels);assert.equal(texture.colorSpace,T.NoColorSpace);assert.equal(texture.flipY,false);assert.equal(texture.generateMipmaps,true);assert.equal(texture.userData.sharedScenery,true);assert.equal(await loader.prepare(),true);assert.equal(fetches,1);texture.dispose();
 const bad=createSpaReflectionLoader({manifest,fetchSheet:async()=>new Uint8Array([8]),decodeSheet:()=>{throw Error('must never decode corrupt PNG');}});assert.equal(await bad.prepare(),false);assert.equal(bad.get(),null);assert.equal(bad.status(),'fallback');
 const unavailable=createSpaReflectionLoader({manifest,fetchSheet:async()=>{throw Error('offline');},decodeSheet:()=>{throw Error('unreachable');}});assert.equal(await unavailable.prepare(),false);assert.equal(unavailable.get(),null);
});
test('SPA array finish composes existing native lamp/static hooks and Fresnel without modifying global Mall materials',()=>{
 const lights=createMallRoomLights(),m=new T.MeshStandardMaterial();resortInteriorLighting(m,lights);const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(shader);
 const oceanShader=shader.fragmentShader;assert.match(oceanShader,/uMallProbe/);const probe={texture:new T.DataArrayTexture(new Uint8Array(4),1,1,1),gain:4};applyResortFinishReflection(shader,probe);
 assert.match(shader.fragmentShader,/sampler2DArray uSpaRoomProbe/);assert.match(shader.fragmentShader,/mallFresnel/);assert.match(shader.fragmentShader,/totalEmissiveRadiance/);assert.match(shader.vertexShader,/aMallRoom-1/);assert.equal(shader.uniforms.uMallProbeGain.value,3.2);
 assert(!oceanShader.includes('uSpaRoomProbe'));assert.match(m.customProgramCacheKey(),/fallback/);probe.texture.dispose();m.dispose();lights.texture.dispose();
});

test('current palace probes map the eight active rooms and the actual sky layer once',()=>{assert.equal(SPA_PROBE.layers,9);assert.deepEqual(SPA_PROBE.rooms,[...RESORT_ACTIVE_ZONES.map(z=>z.id),'resort-sky-pool']);assert.equal(SPA_PROBE.rows,3);});
