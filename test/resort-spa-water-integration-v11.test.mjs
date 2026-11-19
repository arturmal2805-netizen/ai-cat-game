import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
test('all 38 existing SPA waters use metric profiles and one capture; public floor and sky glass keep their own materials',()=>{
 let s,it=resortSpaModelSteps({layoutVersion:7});while(!(s=it.next()).done);const root=s.value;
 try{
  const d=root.userData;assert.equal(d.waterQuality.surfaces,38);assert.equal(d.basins.length,14);assert.equal(d.zones.size,8);
  const counts={};for(const w of d.waters){const m=w.material,q=m.userData.spaWaterQuality;assert.equal(q.version,11);counts[q.kind]=(counts[q.kind]||0)+1;assert(q.depth>0);assert(m.fragmentShader.includes('spaMetricDepth()'));assert(m.fragmentShader.includes('exp(-uSpaAbsorption*path)'));assert(m.fragmentShader.includes('sharedWaterSlope'));assert.equal(m.uniforms.uRipples.value.length,6);}
  assert.deepEqual(counts,{thermal:1,sky:1,vip:8,cafe:4,aroma:6,waterfall:6,cascade:12});
  assert.equal(counts.cabana,undefined,'fixed Cabana plan has no basin; do not invent water');
  for(const b of d.basins){if(b.userData.palacePool.sky){assert(b.userData.bed.material.transparent);continue;}
   const step=b.userData.steps[0],material=step.material;assert.notEqual(material,b.userData.floor.material,'underwater optics cannot leak to the public ivory');
   const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('waterCaustic'));assert(shader.fragmentShader.includes('lampFalloff'));
   assert.equal(shader.uniforms.uWaterLayerDepth.value,-1,'step immersion follows its actual world height');
   let rendered=false;d.renderBatch.traverse(o=>{if(o.isMesh&&o.material===material){rendered=true;assert.equal(o.receiveShadow,false);}});assert(rendered);
  }
  assert.equal(d.waterQuality.refraction.sceneRenders,0);assert.equal(d.waterQuality.refraction.textureBytes,4);
 }finally{root.userData.dispose();assert.equal(root.userData.waterQuality.refraction.textureBytes,0);}
});
