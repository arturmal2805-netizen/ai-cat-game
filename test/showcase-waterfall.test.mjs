import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runSceneSteps} from '../public/scene-tasks.js';
import {showcaseWaterfallSteps} from '../public/showcase-waterfalls.js';

test('all eighteen native waterfall streaks keep fixed buffers and their original modulo trajectory with a continuous opacity fade',()=>{
  for(const height of [2,8,37]){
    const group=runSceneSteps(showcaseWaterfallSteps(0,0,4,height,{})),lines=group.children.find(o=>o.isInstancedMesh),geo=lines.geometry;
    const matrices=lines.instanceMatrix.array.slice(),phase=geo.attributes.aFallPhase,phases=phase.array.slice(),versions=[lines.instanceMatrix.version,phase.version];
    assert.equal(lines.count,18);assert.equal(lines.material.depthWrite,false);
    const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};lines.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uFallHeight.value,height);
    for(let i=0;i<18;i++)assert.ok(Math.abs(phases[i]-i*.24)<1e-6);
    for(let t=0;t<height*2;t+=.07)group.userData.update(t,false);
    assert.deepEqual(lines.instanceMatrix.array,matrices);assert.deepEqual(phase.array,phases);assert.deepEqual([lines.instanceMatrix.version,phase.version],versions);
    assert.match(shader.vertexShader,/transformed.y\+=mod\(aFallPhase,uFallHeight\)-fallDistance/);
    assert.match(shader.fragmentShader,/diffuseColor.a\*=vFallOpacity/);
    group.userData.update(99,true);assert.equal(shader.uniforms.uFallTime.value,0);
  }
});
