import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {encodeSceneryGeometries,decodeSceneryGeometries} from '../public/scenery-geometry-codec.js';
test('offline scenery encoding preserves exact float/index bytes and shares LOD attributes after decoding',async()=>{
 const full=new T.SphereGeometry(3,28,18),lod=new T.BufferGeometry();full.setAttribute('color',new T.BufferAttribute(new Float32Array(full.attributes.position.count*3).fill(.234567),3));
 for(const [name,a]of Object.entries(full.attributes))lod.setAttribute(name,a);lod.setIndex(new T.BufferAttribute(full.index.array.slice(0,300),1));
 const extras={sites:new T.BufferAttribute(new Float64Array([Math.PI,-98.1234567890123,1e-20]),1)};
 const buffer=await encodeSceneryGeometries({full,lod},'exact-test',extras),copy=await decodeSceneryGeometries(buffer,'exact-test',['full','lod']);
 for(const key of Object.keys(full.attributes)){assert.deepEqual(copy.models.full.attributes[key].array,full.attributes[key].array);assert.equal(copy.models.full.attributes[key],copy.models.lod.attributes[key]);}
 assert.deepEqual(copy.models.full.index.array,full.index.array);assert.deepEqual(copy.models.lod.index.array,lod.index.array);assert.deepEqual(copy.extras.sites.array,extras.sites.array);
 await assert.rejects(decodeSceneryGeometries(buffer.slice(0,buffer.byteLength-10),'exact-test',['full','lod']),/Invalid scenery/);
 await assert.rejects(decodeSceneryGeometries(buffer,'old-schema',['full','lod']),/Old scenery/);
 await assert.rejects(decodeSceneryGeometries(buffer,'exact-test',['full']),/Old scenery/);
});
