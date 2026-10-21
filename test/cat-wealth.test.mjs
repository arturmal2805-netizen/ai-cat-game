import test from 'node:test';
import assert from 'node:assert/strict';
import {richestCats} from '../public/cat-wealth.js';
test('the podium ranks exactly three personal wallets, updates after a purchase and never changes profiles',()=>{
 const state={profiles:Object.fromEntries([['a',300],['b',900],['c',600],['d',100],['e',700]].map(([id,coins])=>[id,{id,name:id,coins}]))},before=structuredClone(state);
 assert.deepEqual(richestCats(state).map(p=>p.id),['b','e','c']);assert.deepEqual(state,before);
 state.profiles.b.coins=50;assert.deepEqual(richestCats(state).map(p=>p.id),['e','c','a']);
});
test('wealth ties remain stable, a partial roster works and malformed wallets never enter the podium',()=>{
 assert.deepEqual(richestCats(null),[]);
 const p=[{id:'b',coins:0},{id:'a',coins:0},{id:'bad',coins:NaN},{id:'neg',coins:-1}];
 assert.deepEqual(richestCats({profiles:Object.fromEntries(p.map(p=>[p.id,p]))}).map(p=>p.id),['a','b']);
});
