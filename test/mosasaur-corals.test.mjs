import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mosaCoralSteps,mosaCoralSites,MOSA_CORAL_FORMS} from '../public/mosasaur-corals.js';
import {mosaBedY} from '../public/mosasaur-data.js';
import {mosaReefClearance} from '../public/mosasaur-reef-data.js';
import {runSceneSteps} from '../public/scene-tasks.js';
test('all coral colonies attach to real seabed or sculpted walls, with eleven anatomies and open central ride water',()=>{
 const sites=mosaCoralSites();assert.equal(sites.length,1024);assert.equal(new Set(sites.map(p=>p.id)).size,1024);assert.equal(new Set(sites.map(p=>p.form)).size,11);
 let wall=0;
 for(const p of sites){
  assert.ok(Math.min(Math.abs(p.y-mosaBedY(p.x,p.z)),Math.abs(mosaReefClearance(p.x,p.y,p.z)))<.15,p.id+' floats away from the actual collider');
  assert.ok(p.y<-.6);assert.ok(Math.hypot(p.x,p.z)-p.scale*.65>22);
  assert.ok(Math.abs(Math.hypot(p.nx,p.ny,p.nz)-1)<1e-6);if(p.ny<.9)wall++;
 }
 assert.ok(wall>350,'deep walls carry real colonies, not only the upper ledges');
});
test('spatial coral detail keeps full near meshes, shared LOD buffers and one fixed animation clock',()=>{
 const g=runSceneSteps(mosaCoralSteps()),meshes=[];g.traverse(m=>{if(m.isInstancedMesh)meshes.push(m);});
 assert.ok(g.children.length<=16);assert.deepEqual(new Set(meshes.map(m=>m.name)),new Set(MOSA_CORAL_FORMS));assert.equal(new Set(meshes.map(m=>m.material)).size,1);
 const rows=group=>{const out=new Map();for(const m of group.children)for(let i=0;i<m.count;i++)out.set(m.userData.colonyIds[i],{matrix:m.instanceMatrix.array.slice(i*16,i*16+16),color:m.instanceColor.array.slice(i*3,i*3+3),position:m.geometry.attributes.position,geometry:m.geometry});return out;};
 let total=0;for(const lod of g.children){assert.ok(lod.isLOD);const full=rows(lod.levels[0].object);total+=full.size;for(const level of lod.levels.slice(1)){const far=rows(level.object);assert.deepEqual(new Set(far.keys()),new Set(full.keys()));for(const [id,row]of full){assert.deepEqual(far.get(id).matrix,row.matrix);assert.deepEqual(far.get(id).color,row.color);assert.equal(far.get(id).position,row.position);}}}
 assert.equal(total,1024);
 const baseline=runSceneSteps(mosaCoralSteps({spatialCells:false}));for(let i=0;i<g.children.length;i++)for(let level=0;level<3;level++){const actual=rows(g.children[i].levels[level].object),expected=rows(baseline.children[i].levels[level].object);assert.deepEqual(new Set(actual.keys()),new Set(expected.keys()));for(const [id,row]of expected){assert.deepEqual(actual.get(id).matrix,row.matrix);assert.deepEqual(actual.get(id).color,row.color);assert.equal(actual.get(id).geometry,row.geometry);}if(level===2)assert.equal(g.children[i].levels[level].object.children.length,baseline.children[i].levels[level].object.children.length,'far overview keeps its original combined draw count');}
 const old=meshes.map(m=>[m.instanceMatrix.version,m.instanceMatrix.array.slice()]);for(let i=0;i<100;i++)g.userData.update(i,false);
 meshes.forEach((m,i)=>{assert.equal(m.instanceMatrix.version,old[i][0]);assert.deepEqual(m.instanceMatrix.array,old[i][1]);assert.ok(m.geometry.attributes.aReefGlow);assert.ok(m.geometry.attributes.aReefSway);assert.ok(m.boundingSphere.radius>0);});
 const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_maps>'};meshes[0].material.onBeforeCompile(shader);g.userData.update(5,false);assert.equal(shader.uniforms.uCoralTime.value,5);g.userData.update(14,true);assert.equal(shader.uniforms.uCoralTime.value,0);assert.equal(shader.uniforms.uCoralMotion.value,0);
 for(const geo of new Set(meshes.map(m=>m.geometry)))geo.dispose();meshes[0].material.dispose();
});
