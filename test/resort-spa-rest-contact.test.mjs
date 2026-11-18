import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCat,animateCat,reactCat,disposeCat} from '../public/cat-model.js';
import {applyAtollSit} from '../public/atoll-slide-acting.js';
import {prepareResortExpression,resortDryPerformance,applyResortExpression} from '../public/resort-spa-dry-performance.js';

test('native resting body and animated paw vertices remain supported through settling and awakening at real underwater height',()=>{
 const cat=createCat('happy'),carrier=new T.Group();carrier.position.set(-460,-164.068,695);carrier.rotation.y=.7;carrier.add(cat);carrier.updateMatrixWorld(true);prepareResortExpression(cat);
 const geometry=new Map();cat.traverse(o=>{if(o.isMesh)geometry.set(o,o.geometry);});
 for(const key of ['massage','cabana','nap','amber','midnight'])for(const t of [0,.8,2,6,12,19,21,22,23.99]){
  animateCat(cat,t,false);const reaction=resortDryPerformance(key,'procedure',t).reaction;reactCat(cat,reaction);applyAtollSit(cat,reaction);applyResortExpression(cat,reaction);carrier.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(cat,true),contact=box.min.y-carrier.position.y;
  assert(contact>=-.012&&contact<=.012,JSON.stringify({key,t,contact}));
  for(const [mesh,original]of geometry)assert.equal(mesh.geometry,original);
 }
 animateCat(cat,30,false);carrier.updateMatrixWorld(true);const reset=new T.Box3().setFromObject(cat,true).min.y-carrier.position.y;assert(Math.abs(reset+.00942545)<.003,'ordinary animation resets the temporary support pose');disposeCat(cat);
});
