import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCatBufferPool} from '../public/cat-buffer-pool.js';
import {isGeometryBufferRetirement} from '../public/geometry-residency.js';

function geometry({paint=.4,bend=0,count=3}={}){
 const g=new T.BufferGeometry(),position=new Float32Array(count*3);position[4]=bend;
 g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Int16BufferAttribute(new Int16Array(count*3),3,true));
 g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(count*3).fill(paint),3));g.setAttribute('aRigJoints',new T.Uint8BufferAttribute(new Uint8Array(count*4),4));g.setAttribute('aRigWeights',new T.Uint8BufferAttribute(new Uint8Array(count*4).fill(255),4,true));g.setIndex(new T.Uint32BufferAttribute([0,1,2],1));return g;
}
const structure=g=>[g.index,...['position','normal','aRigJoints','aRigWeights'].map(n=>g.attributes[n])];
test('exact structural cohorts share original immutable buffers while different colours, geometry owners and bounds remain independent',()=>{
 const pool=createCatBufferPool(),a=geometry(),b=geometry({paint:.7}),c=geometry();pool.intern(a);pool.intern(b);pool.intern(c);
 assert.notEqual(a,b);assert.ok(structure(a).every((attr,i)=>attr===structure(b)[i]));assert.notEqual(a.attributes.color,b.attributes.color);assert.equal(a.attributes.color,c.attributes.color);
 a.computeBoundingSphere();b.computeBoundingSphere();assert.notEqual(a.boundingSphere,b.boundingSphere);
 let aa=0,bb=0,gpu=0;a.addEventListener('dispose',()=>aa++);b.addEventListener('dispose',()=>{if(isGeometryBufferRetirement(b))gpu++;else bb++;});a.dispose();assert.equal(aa,1);assert.equal(bb,0);assert.equal(gpu,1);assert.equal(b.attributes.color.array[0],Math.fround(.7));
});
test('sample-hash collisions cannot alias even one differing byte or connect unrelated shapes through a common small index/weight buffer',()=>{
 const pool=createCatBufferPool(),a=geometry({count:1000}),b=geometry({count:1000,bend:1});pool.intern(a);pool.intern(b);
 assert.equal(pool.stats.cohorts,2);assert.ok(structure(a).every((attr,i)=>attr!==structure(b)[i]));assert.equal(a.attributes.position.array[4],0);assert.equal(b.attributes.position.array[4],1);
});
test('layout, GPU semantics, upload hooks, modified/dynamic buffers and future attributes retain the unshared native path',()=>{
 for(const change of [g=>g.attributes.normal.normalized=false,g=>g.index=new T.Uint16BufferAttribute([0,1,2],1)]){
  const pool=createCatBufferPool(),a=geometry(),b=geometry();change(b);pool.intern(a);pool.intern(b);assert.ok(structure(a).every((attr,i)=>attr!==structure(b)[i]));
 }
 for(const change of [g=>g.attributes.position.setUsage(T.DynamicDrawUsage),g=>{g.attributes.position.needsUpdate=true;},g=>g.attributes.position.onUpload(()=>{}),g=>g.setAttribute('futureRigData',new T.Float32BufferAttribute([1,2,3],1))]){
  const pool=createCatBufferPool(),a=geometry(),b=geometry();change(b);const before=structure(b);pool.intern(a);pool.intern(b);assert.deepEqual(structure(b),before);assert.equal(pool.stats.lookups,1);
 }
});
test('weak cohort metadata is bounded and unsupported/disabled pooling preserves the native attributes',()=>{
 const pool=createCatBufferPool({maxKeys:1}),a=geometry(),b=geometry({bend:1}),c=geometry();pool.intern(a);pool.intern(b);pool.intern(c);assert.notEqual(c.attributes.position,a.attributes.position);
 pool.setEnabled(false);const d=geometry(),before=structure(d);pool.intern(d);assert.deepEqual(structure(d),before);
 const weak=globalThis.WeakRef;try{globalThis.WeakRef=undefined;pool.setEnabled(true);pool.intern(d);assert.deepEqual(structure(d),before);}finally{globalThis.WeakRef=weak;}
});
