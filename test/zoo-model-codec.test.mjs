import {test} from 'node:test';import assert from 'node:assert/strict';
import {zooAnimals} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';import {encodeZooTemplate,decodeZooTemplate} from '../public/zoo-model-codec.js';
test('selected-zoo download restores byte-identical complete geometry, skin weights, coat attributes and baked poses for all six species',()=>{
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),source=m.userData.poseData,bytes=encodeZooTemplate(source),copy=decodeZooTemplate(bytes,e.species);
  assert.equal(copy.prebaked,true);assert.deepEqual(copy.values,source.values);assert.deepEqual(copy.geometry.index.array,source.geometry.index.array);assert.deepEqual(copy.joints,source.joints);assert.deepEqual(copy.sculptStats,source.sculptStats);
  for(const [name,a]of Object.entries(source.geometry.attributes)){const b=copy.geometry.attributes[name];assert.equal(b.itemSize,a.itemSize);assert.equal(b.normalized,a.normalized);assert.deepEqual(b.array,a.array,name);}
  assert.throws(()=>decodeZooTemplate(bytes.slice(0,bytes.byteLength-8),e.species));assert.throws(()=>decodeZooTemplate(bytes,'wrong-species'));const bad=bytes.slice(0);new DataView(bad).setUint32(0,0);assert.throws(()=>decodeZooTemplate(bad,e.species));
  copy.geometry.dispose();copy.texture.dispose();m.dispose();m.geometry.dispose();m.material.dispose();
 }
});
