import{test}from'node:test';import assert from'node:assert/strict';import*as T from'three';import{sceneryDetailIndex}from'../public/scenery-detail-levels.js';
test('distant scenery retains native position/normal/UV buffers and bounds while reducing redundant indices',()=>{
 const source=new T.SphereGeometry(4,72,48);source.computeBoundingBox();source.computeBoundingSphere();const index=source.index.array.slice(),positions=source.attributes.position.array.slice();
 const detail=sceneryDetailIndex(source,.035,.4);assert.ok(detail.index.count<source.index.count);assert.ok(detail.userData.lodError<=.035);
 for(const name of Object.keys(source.attributes))assert.equal(detail.attributes[name],source.attributes[name]);assert.deepEqual(source.index.array,index);assert.deepEqual(source.attributes.position.array,positions);assert.deepEqual(detail.boundingSphere,source.boundingSphere);assert.deepEqual(detail.boundingBox,source.boundingBox);
 detail.dispose();source.dispose();
});
test('Float16 scenery is decoded for authoring without rewriting its original compact vertices',()=>{
 const source=new T.SphereGeometry(2,64,36),original=source.attributes.position.array.slice();source.setAttribute('position',new T.Float16BufferAttribute(Array.from(original,n=>T.DataUtils.toHalfFloat(n)),3));const half=source.attributes.position.array.slice();
 const detail=sceneryDetailIndex(source,.04,.5);assert.equal(detail.attributes.position,source.attributes.position);assert.deepEqual(source.attributes.position.array,half);assert.ok(detail.index.count<=source.index.count);if(detail!==source)detail.dispose();source.dispose();
});
