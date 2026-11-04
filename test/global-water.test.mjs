import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLagoon,createWaterfall} from '../public/lagoon.js';
import {disposeBiome} from '../public/biome-scenes.js';
import {waterMaterial,waterFieldTexture,applyUnderwaterLighting} from '../public/water-shading.js';
import {waterEnvironmentTexture} from '../public/water-environment.js';
import {waterSandTexture} from '../public/water-sand.js';
import {courtVenue} from '../public/foodcourt-assets.js';
import {AQUARIUM_TANKS} from '../public/aquarium-data.js';
const shader=m=>{const s={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(s);return s;};
test('all water palettes retain authored colours and the same two wave reads, reflection, impact buffers and single sheet pass',()=>{
 for(const c of [0x08b5d0,0xf49cc8,0x13c4e9,0xb99af6])for(const waterfall of [false,true]){
  const m=waterMaterial(c,.67,{waterfall});assert.equal(m.uniforms.uColor.value.getHex(),c);assert.equal(m.uniforms.uWaterField.value,waterFieldTexture());assert.equal(m.uniforms.uWaterEnvironment.value,waterEnvironmentTexture());
  assert.equal((m.fragmentShader.match(/texture2D\(/g)||[]).length,3);assert.equal(m.uniforms.uRipples.value.length,6);assert.equal(m.forceSinglePass,true);assert.equal(m.depthWrite,false);m.dispose();
 }
});
test('clear seabeds share one small immutable sand texture across disposal and repeated animated updates',()=>{
 const a=createLagoon({fishCount:6}),b=createLagoon({fishCount:6}),sand=waterSandTexture(),before=sand.image.data.slice(),version=sand.version;
 assert.equal(sand.image.data.byteLength,65536);assert.equal(sand.image.width,128);assert.equal(sand.generateMipmaps,true);assert.equal(a.userData.bed.material.map,sand);assert.equal(b.userData.bed.material.map,sand);
 const values=new Set();for(let i=0;i<before.length;i+=4)values.add(before[i]);assert.ok(values.size>=30);
 for(let t=0;t<20;t+=.1){a.userData.update(t);b.userData.update(t);}assert.deepEqual(sand.image.data,before);assert.equal(sand.version,version);
 let disposed=false;sand.addEventListener('dispose',()=>disposed=true);disposeBiome(a);assert.equal(disposed,false);assert.equal(b.userData.bed.material.map,waterSandTexture());disposeBiome(b);
});
test('depth-only basin walls add no wave texture reads, share the real water level and preserve native projection',()=>{
 const level={value:4},clock={value:7},wall=applyUnderwaterLighting(new T.MeshStandardMaterial(),clock,0x13c4e9,{level,refract:false,light:false,depthFog:true}),s=shader(wall);
 assert.equal(s.uniforms.uWaterLevel,level);assert.equal(s.uniforms.uWaterLightTime,clock);assert.equal((s.fragmentShader.match(/texture2D\(/g)||[]).length,0);assert.ok(s.fragmentShader.includes('opticalPath'));
 assert.ok(!s.vertexShader.includes('waterPoint.xz+=bend'));assert.ok(s.fragmentShader.includes('#define STANDARD'));
 const eye=applyUnderwaterLighting(new T.MeshBasicMaterial({color:0x253850}),clock,0x13c4e9,{light:false}),before=T.ShaderLib.basic.fragmentShader,es={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:before};eye.onBeforeCompile(es);assert.equal(es.fragmentShader,before,'dark eyes must remain dark');assert.equal(eye.userData.waterLight.depthFog,false);
});
test('every actual aquarium top uses unit water UVs rather than metre UVs and retains its original fish count',()=>{
 for(const data of AQUARIUM_TANKS){const root=courtVenue(data),waters=[];root.traverse(o=>{if(o.material?.uniforms?.uWaterField)waters.push(o);});assert.equal(waters.length,1);const uv=waters[0].geometry.attributes.uv;
  for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>=-1e-6&&uv.getX(i)<=1.000001);assert.ok(uv.getY(i)>=-1e-6&&uv.getY(i)<=1.000001);}
  assert.equal(root.userData.shoal.userData.palette.tank.fish,data.fish);root.userData.update(3);disposeBiome(root);
 }
});


test('every native waterfall retains 18 real streaks while its shared clock moves fixed GPU buffers and fades wraps',()=>{
 for(const height of [2,8,37]){const root=createWaterfall(0,0,3,height),lines=root.children.find(o=>o.isInstancedMesh),matrix=lines.instanceMatrix.array.slice(),version=lines.instanceMatrix.version,phase=lines.geometry.attributes.aFallPhase;
  assert.equal(lines.count,18);assert.equal(lines.material.depthWrite,false);assert.equal(phase.count,18);
  const s={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};lines.material.onBeforeCompile(s);
  for(let t=0;t<height*2;t+=.07)root.userData.update(t);assert.deepEqual(lines.instanceMatrix.array,matrix);assert.equal(lines.instanceMatrix.version,version);assert.ok(s.fragmentShader.includes('diffuseColor.a*=vFallOpacity'));
  root.userData.update(50,true);assert.equal(s.uniforms.uFallTime.value,0);disposeBiome(root);
 }
});
