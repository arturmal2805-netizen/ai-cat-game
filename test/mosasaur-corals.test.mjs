import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mosaCoralSteps,mosaCoralSites,MOSA_CORAL_FORMS} from '../public/mosasaur-corals.js';import {mosaBedY} from '../public/mosasaur-data.js';import {runSceneSteps} from '../public/scene-tasks.js';
test('ninety-six distinct deep colonies stay grounded, outside the native ride and below water',()=>{
 const sites=mosaCoralSites();assert.equal(sites.length,96);assert.equal(new Set(sites.map(p=>p.id)).size,96);assert.equal(new Set(sites.map(p=>p.form)).size,6);
 for(const p of sites){assert.equal(p.y,mosaBedY(p.x,p.z)+.05);assert.ok(p.y< -5);assert.ok(Math.hypot(p.x,p.z)-p.scale*.65>22);}
});
test('all coral detail reuses six draws, fixed buffers and one shared animation clock',()=>{
 const g=runSceneSteps(mosaCoralSteps());assert.equal(g.children.length,6);assert.deepEqual(g.children.map(m=>m.name),MOSA_CORAL_FORMS);
 const materials=new Set(g.children.map(m=>m.material));assert.equal(materials.size,1);
 const old=g.children.map(m=>[m.instanceMatrix.version,[...m.instanceMatrix.array]]);
 for(let i=0;i<100;i++)g.userData.update(i,false);
 g.children.forEach((m,i)=>{assert.equal(m.count,16);assert.equal(m.instanceMatrix.version,old[i][0]);assert.deepEqual([...m.instanceMatrix.array],old[i][1]);assert.ok(m.geometry.attributes.color);assert.ok(m.boundingSphere.radius>0);});
 const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <color_fragment>'};g.children[0].material.onBeforeCompile(shader);g.userData.update(5,false);assert.equal(shader.uniforms.uCoralTime.value,5);g.userData.update(14,true);assert.equal(shader.uniforms.uCoralTime.value,0);assert.equal(shader.uniforms.uCoralMotion.value,0);
 for(const m of g.children)m.geometry.dispose();g.children[0].material.dispose();
});
