import test from 'node:test';
import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import * as T from 'three';
import {RESORT_SPA as S} from '../public/resort-spa-data.js';

test('SPA immutable bake preserves authored opaque shadow casters without making glass and water opaque shadows',()=>{
 const it=resortSpaModelSteps();let result;do{result=it.next();}while(!result.done);const root=result.value,batches=[];
 root.userData.renderBatch.traverse(o=>{if(o.isMesh)batches.push(o);});
 assert(batches.some(o=>!o.material.transparent&&o.castShadow),'authored furniture/opaque ceilings must still cast shadows after preparation');
 for(const mesh of batches)if(mesh.material.transparent)assert.equal(mesh.castShadow,false,'transparent envelope/water must not become an opaque caster');
 root.userData.dispose();
});
test('Cafe roof and hanging fixtures do not pierce the actual glass sky-pool water volume',()=>{
 const it=resortSpaModelSteps();let result;do{result=it.next();}while(!result.done);const root=result.value,p=new T.Vector3();root.updateMatrixWorld(true);
 root.userData.decor.traverse(o=>{if(!o.isMesh||o.geometry.type!=='TubeGeometry')return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert(!(p.y>S.y+16.25&&p.y<S.y+18.1&&Math.hypot(p.x,p.z-203)<17.7),'a dry decorative arch/pendant crosses the actual pool interior');}});
 root.userData.dispose();
});
