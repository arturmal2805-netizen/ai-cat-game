import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
test('batched SPA liners retain animated shared caustics AFTER room lighting, with the actual shallow pool level and unchanged geometry',()=>{
 let s,it=resortSpaModelSteps({layoutVersion:7});while(!(s=it.next()).done);const root=s.value;
 try{for(const basin of root.userData.basins.filter(b=>!b.userData.palacePool.sky)){
  const material=basin.userData.bed.material,shader={uniforms:T.UniformsUtils.clone(T.ShaderLib.standard.uniforms),vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
  let rendered=false;root.userData.renderBatch.traverse(o=>{if(o.isMesh&&o.material===material)rendered=true;});assert(rendered,'test the actual retained batch material');
  material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('float waterCaustic='),'room lighting must not erase the pool optics');assert(shader.fragmentShader.includes('lampFalloff'),'bounded room light remains composed');
  assert.equal(shader.uniforms.uWaterLightTime,basin.userData.surface.material.uniforms.uTime,'caustics advance with the actual surface clock');assert.equal(shader.uniforms.uWaterLevel.value,basin.userData.palacePool.y);assert.equal(shader.uniforms.uWaterLayerDepth.value,1.8);
  assert(material.customProgramCacheKey().includes('spa-shallow-caustics-v8'));assert.equal(basin.userData.depth,1.8);
 }}finally{root.userData.dispose();}
});
