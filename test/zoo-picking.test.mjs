import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {ZOO_EXHIBITS,ZOO_BIOME} from '../public/zoo-data.js';import {pickZooExhibit} from '../public/zoo-picking.js';
test('actual habitat picking handles overhead, front and grazing rays without depending on the old low invisible proxy or distant buildings',()=>{
 for(const e of ZOO_EXHIBITS){const point=new T.Vector3(ZOO_BIOME.center[0]+e.x,1,ZOO_BIOME.center[1]+e.z);for(const offset of [[0,30,0],[2,9,25],[18,4,2]]){const origin=point.clone().add(new T.Vector3(...offset)),ray=new T.Ray(origin,point.clone().sub(origin).normalize());assert.equal(pickZooExhibit(ray)?.id,e.id);}}
 assert.equal(pickZooExhibit(new T.Ray(new T.Vector3(207,30,136),new T.Vector3(0,-1,0))),null);assert.equal(pickZooExhibit(new T.Ray(new T.Vector3(0,10,0),new T.Vector3(0,-1,0))),null);
});
