import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {MOSA_WATER_PROBE,MOSA_WATER_PROBE_REVISION} from '../public/mosasaur-water-probe-assets.js';
import {MOSA_PROBE_INPUTS} from '../scripts/mosasaur-probe-inputs.mjs';
import {waterMaterial} from '../public/water-shading.js';
import {installMosasaurWaterOptics} from '../public/mosasaur-water-optics.js';
import * as T from 'three';
import {applyUnderwaterLighting} from '../public/water-shading.js';
import {applyMosasaurBedOptics} from '../public/mosasaur-bed-optics.js';
import {waterSandTexture} from '../public/water-sand.js';
import {createShaderWarmup} from '../public/shader-warmup.js';
test('the ocean reflection is a valid immutable local capture of its current native coastal producers',async()=>{
 const hash=createHash('sha256');for(const f of MOSA_PROBE_INPUTS)hash.update(f).update(await readFile(new URL('../public/'+f,import.meta.url)));
 assert.equal(MOSA_WATER_PROBE_REVISION,hash.digest('hex').slice(0,16));
 const bytes=await readFile(new URL('../public/'+MOSA_WATER_PROBE.slice(2),import.meta.url));assert.ok(bytes.length<100000);assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);
 assert.ok(MOSA_WATER_PROBE.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
});
test('the native warmup uploads every hidden ocean sampler before compiling its first live material',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),uploaded=new Set();
 const material=applyMosasaurBedOptics(applyUnderwaterLighting(new T.MeshStandardMaterial({map:waterSandTexture()}),{value:0}),{stoneNormals:true}),mesh=new T.Mesh(new T.BoxGeometry(),material);
 scene.add(mesh);const expected=[material.map,material.mosaBedStone,material.mosaBedGround,material.mosaBedNormal,material.mosaWaterField];assert.ok(expected.every(t=>t?.isTexture));
 const renderer={toneMapping:T.ACESFilmicToneMapping,outputColorSpace:T.SRGBColorSpace,shadowMap:{type:T.PCFShadowMap},info:{programs:[]},initTexture(t){uploaded.add(t);},async compileAsync(){for(const t of expected)assert.ok(uploaded.has(t),'a custom sampler would otherwise upload during the live draw');}};
 const warm=createShaderWarmup(renderer,scene,camera);await warm.prepare(mesh);assert.equal(uploaded.size,new Set(expected).size);warm.dispose();mesh.geometry.dispose();material.dispose();
});
test('ocean optics retain the native two field samples, one reflection lookup and bounded scalar wake slots',()=>{
 const material=waterMaterial(),field=material.uniforms.uWaterField.value,ripples=material.uniforms.uRipples.value;
 installMosasaurWaterOptics(material);const shader={uniforms:{},vertexShader:material.vertexShader,fragmentShader:material.fragmentShader};material.onBeforeCompile(shader);
 assert.equal(material.uniforms.uWaterField.value,field);assert.equal(material.uniforms.uRipples.value,ripples);assert.equal(ripples.length,6);
 assert.equal((shader.fragmentShader.match(/texture2D\(uWaterField/g)||[]).length,2);assert.equal((shader.fragmentShader.match(/texture2D\(uWaterEnvironment/g)||[]).length,1);
 assert.ok(shader.vertexShader.includes('uTime'));assert.ok(shader.fragmentShader.includes('vPhysicalBedDepth'));material.dispose();
});
