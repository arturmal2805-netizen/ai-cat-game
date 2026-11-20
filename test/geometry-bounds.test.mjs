import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {geometryBoundsSteps} from '../public/geometry-bounds.js';
const run=it=>{let step;do{step=it.next();}while(!step.done);return step.value;};
test('cooperative static bounds match native spheres bit for bit for actual Float16/interleaved/off-centre geometry',()=>{
 const cases=[new T.TorusKnotGeometry(17,3,280,16),new T.BoxGeometry(4,7,11,18,16,12),new T.BufferGeometry(),new T.BufferGeometry()];
 const raw=new Float32Array(30003);for(let i=0;i<raw.length;i++)raw[i]=Math.sin(i*1.398)*23+Math.cos(i*.01)*5;
 cases[2].setAttribute('position',new T.Float16BufferAttribute(Array.from(raw,T.DataUtils.toHalfFloat),3));cases[3].setAttribute('position',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(raw,3),3,0));
 for(const g of cases){g.translate(143,-35,79);g.boundingSphere=null;const native=g.clone();native.computeBoundingSphere();const it=geometryBoundsSteps(g);assert.equal(it.next().done,false);assert.equal(g.boundingSphere,null,'partial bounds must never reach rendering');run(it);assert.deepEqual(g.boundingSphere,native.boundingSphere);}
});
test('cooperative work preserves native/custom/morph bounds and abandons replaced or mutated buffers',()=>{
 const make=()=>new T.SphereGeometry(4,200,120);
 for(const mutation of [g=>g.attributes.position.needsUpdate=true,g=>g.setAttribute('position',g.attributes.position.clone()),g=>g.computeBoundingSphere(),g=>g.morphAttributes.position=[g.attributes.position.clone()]]){const g=make(),it=geometryBoundsSteps(g);it.next();mutation(g);const bound=g.boundingSphere;assert.equal(run(it),false);assert.equal(g.boundingSphere,bound);}
 const custom=make();custom.computeBoundingSphere=()=>{throw Error('must not call custom');};assert.equal(run(geometryBoundsSteps(custom)),false);assert.equal(custom.boundingSphere,null);
 const morph=make();morph.morphAttributes.position=[morph.attributes.position.clone()];assert.equal(run(geometryBoundsSteps(morph)),false);
 const ready=make();ready.computeBoundingSphere();const bound=ready.boundingSphere;assert.equal(run(geometryBoundsSteps(ready)),false);assert.equal(ready.boundingSphere,bound);
});
test('direct static reads preserve normalized/custom getters, empty buffers and Float64 arithmetic exactly',()=>{
 const geometries=[];
 for(const attr of [new T.BufferAttribute(new Uint16Array([0,65535,30000,1400,50,90]),3,true),new T.BufferAttribute(new Float64Array([1e100,-.003,1e-50,-1e100,.004,7]),3),new T.BufferAttribute(new Float32Array(),3)]){const g=new T.BufferGeometry();g.setAttribute('position',attr);geometries.push(g);}
 const custom=new T.BufferGeometry(),p=new T.Float32BufferAttribute([1,2,3,4,5,6],3),getY=p.getY;p.getY=function(i){return getY.call(this,i)+7;};custom.setAttribute('position',p);geometries.push(custom);
 for(const g of geometries){g.computeBoundingSphere();const native=g.boundingSphere.clone();g.boundingSphere=null;run(geometryBoundsSteps(g));assert.deepEqual(g.boundingSphere,native);assert.equal(g.boundingBox,null);}
});
