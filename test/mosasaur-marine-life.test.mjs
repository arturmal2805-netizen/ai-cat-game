import{test}from'node:test';import assert from'node:assert/strict';import{mosaMarineLifeSteps}from'../public/mosasaur-marine-life.js';import{runSceneSteps}from'../public/scene-tasks.js';
test('rays, jellyfish and crabs keep immutable instance/geometry buffers and freeze correctly for reduced motion',()=>{
 const g=runSceneSteps(mosaMarineLifeSteps());assert.deepEqual(g.children.map(m=>m.count),[6,8,12]);const arrays=g.children.map(m=>[m.instanceMatrix.version,m.instanceMatrix.array.slice(),m.geometry.attributes.position.array.slice()]);
 for(let i=0;i<200;i++)g.userData.update(i,false);g.children.forEach((m,i)=>{assert.equal(m.instanceMatrix.version,arrays[i][0]);assert.deepEqual(m.instanceMatrix.array,arrays[i][1]);assert.deepEqual(m.geometry.attributes.position.array,arrays[i][2]);assert.ok(m.boundingSphere.radius>2);});
 const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <color_fragment>'};g.children[0].material.onBeforeCompile(shader);g.userData.update(8,false);assert.equal(shader.uniforms.uFaunaTime.value,8);assert.equal(shader.uniforms.uFaunaMotion.value,1);g.userData.update(40,true);assert.equal(shader.uniforms.uFaunaTime.value,0);assert.equal(shader.uniforms.uFaunaMotion.value,0);
 for(const m of g.children)m.geometry.dispose();g.children[0].material.dispose();
});
