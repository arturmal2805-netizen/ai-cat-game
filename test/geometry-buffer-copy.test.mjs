import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { copyGeometryBuffers } from '../public/geometry-tasks.js';

test('baking copies approved primitive buffers exactly without re-running procedural constructors', () => {
  for (const source of [new T.SphereGeometry(1,12,8), new T.TorusGeometry(2,.2,6,36), new RoundedBoxGeometry(1,2,3,2,.12)]) {
    source.translate(.13,.22,.47);
    source.computeBoundingBox(); source.computeBoundingSphere();
    source.setDrawRange(3, source.index ? source.index.count-3 : 30);
    // A constructor which would be called by Geometry.clone(), even though
    // only the already-built buffers are needed for the combined scene.
    source.constructor = class { constructor() { throw Error('Rebuilt source'); } };
    const copy = copyGeometryBuffers(source);
    assert.deepEqual(copy.groups,source.groups);
    assert.deepEqual(copy.drawRange,source.drawRange);
    assert.deepEqual(copy.boundingBox,source.boundingBox);
    assert.deepEqual(copy.boundingSphere,source.boundingSphere);
    for (const key of Object.keys(source.attributes)) {
      const a=source.attributes[key], b=copy.attributes[key];
      assert.deepEqual(b.array,a.array,key);
      assert.notEqual(b.array,a.array,key+' is owned independently');
      assert.equal(b.normalized,a.normalized);
    }
    assert.deepEqual(copy.index?.array,source.index?.array);
    const previous=source.attributes.position.getX(0);
    copy.translate(9,8,7);
    assert.equal(source.attributes.position.getX(0),previous,'baking never mutates shared source');
  }
});
