import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {applyUnderwaterLighting, waterMaterial} from '../public/water-shading.js';
import {polishShowcaseBottom} from '../public/showcase-bottom-light.js';
import {polishShowcaseWater,detailShowcaseBasin,showcaseBedHeight} from '../public/showcase-water-optics.js';
import {receivingPool} from '../public/reference-slide-assets.js';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';

const compile=material=>{
  const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <color_fragment>'};
  material.onBeforeCompile(shader);return shader;
};

test('local bottom light composes with native underwater uniforms and callbacks without extra field samples or changes to other water',()=>{
  const clock={value:3},level={value:1.45},base=new T.MeshStandardMaterial();
  let calls=0; base.onBeforeCompile=()=>calls++;
  applyUnderwaterLighting(base,clock,0x24b9ff,{level,refract:false});
  const before=compile(base), original=new T.MeshStandardMaterial();
  const light=base.userData.waterLight,field=light.texture,key=base.customProgramCacheKey();
  polishShowcaseBottom(base);const after=compile(base), once=base.onBeforeCompile;
  assert.equal(calls,2);assert.equal(after.uniforms.uWaterLightTime,clock);assert.equal(after.uniforms.uWaterLevel,level);
  assert.equal(after.uniforms.uWaterField.value,field);assert.equal(base.userData.waterLight,light);
  assert.equal((after.fragmentShader.match(/texture2D\(/g)||[]).length,2);
  assert.equal((before.fragmentShader.match(/texture2D\(/g)||[]).length,2);
  assert.equal(after.vertexShader,before.vertexShader,'native projection/refraction and picking stay unchanged');
  assert.equal(base.customProgramCacheKey(),key+'-showcase-bottom-v1');
  assert.equal(polishShowcaseBottom(base),base);assert.equal(base.onBeforeCompile,once);
  assert.equal(original.userData.showcaseBottomLight,undefined);
});

test('clear water keeps its original sampler, ripple, wave and geometry contracts through optical-depth and filtered-sun shading',()=>{
  const original=waterMaterial(),m=waterMaterial(),field=m.uniforms.uWaterField.value,ripples=m.uniforms.uRipples.value;
  polishShowcaseWater(m,SHOWCASE_WATER_RIDES[1]);
  assert.equal(m.uniforms.uWaterField.value,field);assert.equal(m.uniforms.uRipples.value,ripples);
  assert.equal((m.fragmentShader.match(/texture2D\(/g)||[]).length,(original.fragmentShader.match(/texture2D\(/g)||[]).length);
  assert.equal((m.fragmentShader.match(/float roughness=/g)||[]).length,1);
  assert.ok(!m.fragmentShader.includes('p.yx*.53'),'old high-frequency surface must not form narrow reflective bands');
  assert.equal(m.transparent,true);assert.equal(m.depthWrite,false);assert.equal(m.forceSinglePass,true);
});

test('receiving-floor colour follows the actual sloping bed while optical polish retains its durable meshes and clocks',()=>{
  const pool=detailShowcaseBasin(receivingPool(SHOWCASE_WATER_RIDES[1])),bed=pool.userData.bed,p=bed.geometry.attributes.position,c=bed.geometry.attributes.color;
  const centre=new T.Color().fromBufferAttribute(c,0),shore=new T.Color().fromBufferAttribute(c,c.count-1);
  assert.ok(centre.b>centre.g*1.4,'blue depth contrast');assert.ok(shore.r>shore.b,'warm visible shore sand');
  for(let i=0;i<p.count;i++){
    const r=Math.hypot(p.getX(i)/pool.userData.rx,p.getZ(i)/pool.userData.rz);
    assert.ok(Math.abs(p.getY(i)-showcaseBedHeight(r))<1e-6);
    assert.ok(.155-p.getY(i)>.39);
  }
  assert.equal(bed.material.userData.showcaseBottomLight,true);
  assert.equal(pool.userData.showcaseBasin.stones.material.userData.showcaseBottomLight,true);
});
