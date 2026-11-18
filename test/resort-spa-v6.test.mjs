import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {RESORT_ZONES} from '../public/resort-spa-data.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {resortSurfaceMaps} from '../public/resort-spa-surfaces.js';
import {mosaBedY,mosaWaterRadius} from '../public/mosasaur-data.js';
function model(){const it=resortSpaModelSteps();let r;do{r=it.next();}while(!r.done);return r.value;}
test('glass sky pool has a real transparent bed, an unblocked walking bridge and no opaque floor underneath',()=>{
 const root=model(),pool=root.getObjectByName('Glass Sky Pool'),bed=pool.userData.bed,nav=createResortSpaNavigation(root);
 assert.equal(root.userData.zones.size,14);assert.deepEqual([...root.userData.zones.keys()],[...RESORT_ZONES.map(z=>z.id)]);
 assert(bed.material.transparent&&bed.material.opacity<.4);assert.equal(bed.material.side,T.DoubleSide);
 const ray=new T.Raycaster(new T.Vector3(0,-154.5,203),new T.Vector3(0,1,0));ray.far=6;
 const hits=ray.intersectObjects([root.userData.surfaces,root.userData.solid],true);assert(hits.some(h=>h.object===bed));assert(hits.every(h=>h.object.material.transparent),'lower atrium must see through the actual floor');
 assert(nav.segmentClear({x:0,y:18.012,z:217},{x:0,y:18.012,z:213.8},.571));
 root.userData.dispose();
});
test('SPA PBR color maps are sRGB while normal and roughness charts remain linear data',()=>{
 for(const kind of ['marble','fabric']){const maps=resortSurfaceMaps(kind);assert.equal(maps.map.colorSpace,T.SRGBColorSpace);assert.equal(maps.normalMap.colorSpace,T.NoColorSpace);assert.equal(maps.roughnessMap.colorSpace,T.NoColorSpace);for(const t of Object.values(maps))t.dispose();}
});
test('SPA overview eye is inside real open water rather than the old shallow shoreline wall',()=>{
 const a=1,e=.8,d=175,x=Math.sin(a)*Math.cos(e)*d,z=225-20+Math.cos(a)*Math.cos(e)*d,y=-162+Math.sin(e)*d;
 assert(mosaWaterRadius(x,z)<1);assert(mosaBedY(x,z)<y-5);
});
