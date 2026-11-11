import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {compactMallGeometrySteps} from '../public/mall-buffer-compaction.js';
import {runSceneSteps} from '../public/scene-tasks.js';
const stream=g=>Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Array.from(g.index.array).flatMap(i=>Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize)))]));
test('Mall compaction retains every indexed attribute byte, triangle/face order, bounds and native ray hit',()=>{
 const g=new T.BoxGeometry(2,3,4).toNonIndexed(),source=g.clone(),n=g.attributes.position.count;
 g.setAttribute('aMallRoom',new T.Uint8BufferAttribute(Uint8Array.from({length:n},(_,i)=>i%3),1));
 g.setAttribute('color',new T.Uint8BufferAttribute(Uint8Array.from({length:n*3},(_,i)=>i%255),3,true));
 // Deliberately unused vertices belong to the old construction representation.
 g.setIndex(new T.Uint32BufferAttribute([0,1,2,0,1,2,9,10,11],1));g.computeBoundingBox();g.computeBoundingSphere();
 const before=stream(g),groups=structuredClone(g.groups),box=g.boundingBox.clone(),sphere=g.boundingSphere.clone(),m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster(new T.Vector3(6,0,0),new T.Vector3(-1,0,0));m.updateMatrixWorld();const hits=ray.intersectObject(m).map(h=>({face:h.faceIndex,point:h.point.toArray(),uv:h.uv.toArray()}));
 assert.ok(runSceneSteps(compactMallGeometrySteps(g))>0);assert.deepEqual(stream(g),before);assert.ok(g.index.array instanceof Uint32Array);assert.equal(g.attributes.color.normalized,true);assert.deepEqual(g.groups,groups);assert.deepEqual(g.boundingBox,box);assert.deepEqual(g.boundingSphere,sphere);assert.deepEqual(ray.intersectObject(m).map(h=>({face:h.faceIndex,point:h.point.toArray(),uv:h.uv.toArray()})),hits);assert.equal(source.attributes.position.count,n);assert.equal(runSceneSteps(compactMallGeometrySteps(g)),0);
});
test('Mall compaction leaves dynamic instance attributes and unindexed geometry untouched',()=>{
 for(const g of [new T.BoxGeometry().toNonIndexed(),new T.BoxGeometry()]){if(g.index)g.setAttribute('aMallRoom',new T.InstancedBufferAttribute(new Uint8Array([1,2,3]),1));const attrs={...g.attributes},idx=g.index;assert.equal(runSceneSteps(compactMallGeometrySteps(g)),0);assert.deepEqual(g.attributes,attrs);assert.equal(g.index,idx);}
});
