import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createCat,animateCat} from '../public/cat-model.js';
import {applyExplorerLocomotion} from '../public/explorer-locomotion.js';

test('explorer gait moves the approved native legs by travelled phase and resets at stop/cancel without changing geometry',()=>{
 const cat=createCat('happy');
 const hash=()=>{const h=createHash('sha256');cat.traverse(o=>{if(o.isMesh){for(const a of Object.values(o.geometry.attributes))h.update(new Uint8Array(a.array.buffer));if(o.geometry.index)h.update(new Uint8Array(o.geometry.index.array.buffer));}});return h.digest('hex');};
 const geometry=hash();animateCat(cat,1,false,false);const idle=cat.userData.legs.map(l=>l.rotation.x);
 applyExplorerLocomotion(cat,{mode:'walk',phase:Math.PI/2,speed:5});const walking=cat.userData.legs.map(l=>l.rotation.x);assert.ok(walking.some((v,i)=>Math.abs(v-idle[i])>.1));
 animateCat(cat,1.1,false,false);applyExplorerLocomotion(cat,{mode:'walk',phase:Math.PI/2,speed:0});assert.deepEqual(cat.userData.legs.map(l=>l.rotation.x),idle,'zero displacement cannot keep a walking stroke');
 animateCat(cat,1.2,false,false);applyExplorerLocomotion(cat,{mode:'swim',phase:Math.PI/2,speed:12});assert.ok(cat.userData.legs.some((l,i)=>Math.abs(l.rotation.x-idle[i])>.2));
 animateCat(cat,1.3,false,false);assert.deepEqual(cat.userData.legs.map(l=>l.rotation.x),idle,'ordinary life restores native joints after explorer cancellation');assert.equal(hash(),geometry);
 animateCat(cat,1.4,false,true);const reduced=cat.userData.legs.map(l=>l.rotation.x);applyExplorerLocomotion(cat,{mode:'swim',phase:1,speed:12},true);assert.deepEqual(cat.userData.legs.map(l=>l.rotation.x),reduced);
});
