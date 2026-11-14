import test from 'node:test';
import assert from 'node:assert/strict';
import {mallCameraGuests,randomMallGuest} from '../public/mall-guests.js';

const actor=id=>({id,model:{userData:{head:{}}},carrier:{parent:{}}});
test('Mall camera accepts only actual interior shoppers across all floors',()=>{
  const actors=['food','fashion','outside','boat','queue','unknown','cashier'].map(actor);
  const visits=new Map([
    ['food',{storeId:'mall-mcd',floor:3,phase:'experience'}],
    ['fashion',{storeId:'mall-vuitton',floor:1,phase:'walk'}],
    ['outside',{storeId:'mall-mcd',floor:0,phase:'walk'}],
    ['boat',{storeId:'mall-mcd',floor:3,phase:'riding'}],
    ['queue',{storeId:'mall-mcd',floor:3,phase:'queue'}],
    ['unknown',{storeId:'missing',floor:3,phase:'walk'}],
  ]);
  assert.deepEqual(mallCameraGuests(actors,visits).map(g=>g.id),['food','fashion']);
  visits.get('food').floor=0;
  assert.deepEqual(mallCameraGuests(actors,visits).map(g=>g.id),['fashion']);
});
test('Native bench guests remain eligible on other cutaway floors; room props do not',()=>{
  const guest={id:'ambient',cat:{userData:{head:{}}},carrier:{parent:{}},floor:7};
  assert.equal(mallCameraGuests([],new Map(),[guest])[0].model,guest.cat);
  assert.equal(mallCameraGuests([],new Map(),[{...guest,roomGuest:true}]).length,0);
});
test('Random visitor avoids immediate repeats and has no island fallback',()=>{
  const guests=[{id:'a'},{id:'b'},{id:'c'}];
  for(const roll of [0,.3,.99])assert.notEqual(randomMallGuest(guests,'b',()=>roll).id,'b');
  assert.equal(randomMallGuest([guests[0]],'a').id,'a');
  assert.equal(randomMallGuest([],'a'),null);
});
