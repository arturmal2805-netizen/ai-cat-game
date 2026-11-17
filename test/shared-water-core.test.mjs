import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {waterMaterial,applyUnderwaterLighting} from '../public/water-shading.js';
import {waterFieldTexture,prepareWaterField} from '../public/water-field.js';
import {mosaWaterField,prepareMosaWaterField,useMosasaurWaterField} from '../public/mosasaur-water-field.js';
import {installMosasaurWaterOptics} from '../public/mosasaur-water-optics.js';
import {polishShowcaseWater} from '../public/showcase-water-optics.js';
import {polishShowcaseBottom} from '../public/showcase-bottom-light.js';
import {slideBasinWater} from '../public/slide-basin-optics.js';
import {WATER_FIELD_GLSL,WATER_MEDIUM} from '../public/water-core.js';

test('all surface profiles share the same field, sampling, Fresnel and filtered highlight core',()=>{
 const pool=slideBasinWater(waterMaterial());
 const flowing=polishShowcaseWater(waterMaterial(0x1499fa,.79,{flow:{speed:8,width:13}}),{id:'ride-water-canyon-rafting'});
 const ocean=installMosasaurWaterOptics(waterMaterial());
 const materials=[waterMaterial(),waterMaterial(0xf49cc8),pool,flowing,ocean,waterMaterial(0x68dbe4,.67,{waterfall:true})];
 for(const material of materials){
  const shader={uniforms:{},vertexShader:material.vertexShader,fragmentShader:material.fragmentShader};material.onBeforeCompile(shader);
  assert.equal(material.uniforms.uWaterField.value,waterFieldTexture());
  assert.ok(shader.fragmentShader.includes(WATER_FIELD_GLSL));
  assert.equal((shader.fragmentShader.match(/float roughness=/g)||[]).length,1);
  assert.match(shader.fragmentShader,/float fresnel=\.0204\+/);
  assert.equal((shader.fragmentShader.match(/texture2D\(uWaterField/g)||[]).length,2);
  assert.equal((shader.fragmentShader.match(/texture2D\(uWaterEnvironment/g)||[]).length,1);
  assert.equal(material.toneMapped,true);assert.equal(material.depthWrite,false);assert.equal(material.forceSinglePass,true);
  material.dispose();
 }
 assert.match(ocean.vertexShader,/vec3 p=position/);
});

test('surface, raised sheet and ocean bottom keep independent clocks but one optical medium',()=>{
 const clocks=[{value:3},{value:7},{value:11}],materials=clocks.map(c=>applyUnderwaterLighting(new T.MeshStandardMaterial(),c));
 materials[1].userData.showcaseRiverBed=true;polishShowcaseBottom(materials[1]);useMosasaurWaterField(materials[2]);
 for(const [i,material]of materials.entries()){
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uWaterLightTime,clocks[i]);
  assert.equal(shader.uniforms.uWaterField.value,waterFieldTexture());
  assert.deepEqual(shader.uniforms.uWaterExtinction.value.toArray(),[...WATER_MEDIUM.extinction]);
  assert.equal(shader.uniforms.uWaterScatterRate.value,WATER_MEDIUM.scatterRate);
  assert.equal(shader.uniforms.uWaterLayerDepth.value,i===1?.23:-1);
  assert.match(shader.fragmentShader,/vec3 submergedPoint=vec3\(vWaterLightPoint.x,vWaterWorldY,/);
  assert.ok(shader.fragmentShader.includes(WATER_FIELD_GLSL));
  assert.equal((shader.fragmentShader.match(/texture2D\(uWaterField/g)||[]).length,2);
  assert.equal((shader.vertexShader.match(/texture2D\(uWaterField/g)||[]).length,1);
  material.dispose();
 }
});

test('the former ocean loader and the whole-map loader coalesce into one decoded shared data texture',async()=>{
 const saved={window:globalThis.window,fetch:globalThis.fetch,bitmap:globalThis.createImageBitmap};let requests=0,decodes=0;
 globalThis.window={};globalThis.fetch=async()=>{requests++;return new Response(new Uint8Array([1,2,3]));};
 globalThis.createImageBitmap=async()=>{decodes++;return{width:1024,height:1024,close(){}};};
 try{
  const a=prepareWaterField(),b=prepareMosaWaterField();assert.equal(a,b);
  assert.equal(await a,true);assert.equal(requests,1);assert.equal(decodes,1);
  const common=waterFieldTexture();assert.equal(common,mosaWaterField());
  assert.equal(common.image.width,1024);assert.equal(common.colorSpace,T.NoColorSpace);
  for(const material of [waterMaterial(),slideBasinWater(waterMaterial()),installMosasaurWaterOptics(waterMaterial())]){
   assert.equal(material.uniforms.uWaterField.value,common);material.dispose();
  }
 }finally{
  if(saved.window===undefined)delete globalThis.window;else globalThis.window=saved.window;
  globalThis.fetch=saved.fetch;
  if(saved.bitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=saved.bitmap;
 }
});
