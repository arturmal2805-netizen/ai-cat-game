import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,saveGame,loadGame} from '../public/economy.js';
import {ensureJobCity,buyCatProduct,catProducts} from '../public/jobcity-system.js';
import {MALL_STORES,MALL_PRODUCTS} from '../public/mall-data.js';
import {buyMallProduct,useMallProduct,validateMallEconomy,mallStock} from '../public/mall-system.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {leisureOffers,validateLeisureOffers} from '../public/leisure-data.js';
const now=1794384000000;
function seed(){let g=newGame(now);g.unlocked.push('autumn','jobcity');g=ensureJobCity(g,now);g.jobCity.profiles.chichi.coins=10000;return g;}
const item=MALL_PRODUCTS.find(p=>p.kind==='fashion');
function reload(g){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};assert.ok(saveGame(storage,g));return loadGame(storage,now,{advance:false});}
test('mall appends seven floors and real destinations to the existing AI catalogue',()=>{
 const g=seed(),offers=leisureOffers(g);assert.deepEqual([...new Set(MALL_STORES.map(s=>s.floor))],[1,2,3,4,5,6,7]);
 assert.equal(offers.filter(o=>o.id.startsWith('mall-')).length,MALL_STORES.length);
 assert.deepEqual(validateLeisureOffers(offers),offers);
 assert.equal(catProducts(g).filter(p=>p.category==='mall').length,MALL_PRODUCTS.length);
});
test('existing private wallet buys once, retains its permanent receipt and exact inventory over two reloads',()=>{
 const g=seed(),n=buyCatProduct(g,'chichi',item.id,'mall-chichi-1',now),p=n.jobCity.profiles.chichi;
 assert.equal(p.coins,10000-item.price);assert.equal(p.inventory[item.id],1);assert.equal(g.jobCity.profiles.chichi.coins,10000);
 assert.equal(buyMallProduct(n,'chichi',item.id,'mall-chichi-1',now),n);
 assert.throws(()=>buyMallProduct(n,'chichi',MALL_PRODUCTS.find(p=>p.id!==item.id).id,'mall-chichi-1',now));
 const restored=reload(reload(n));assert.deepEqual(restored.jobCity.profiles.chichi.mall,p.mall);assert.equal(restored.jobCity.profiles.chichi.coins,p.coins);assert.equal(restored.jobCity.profiles.chichi.inventory[item.id],1);
 validateMallEconomy(restored);
});
test('poor balance, unavailable ocean, stale sequence and repeated unique item fail without mutating the save',()=>{
 for(const mutate of [g=>g.jobCity.profiles.chichi.coins=0,g=>g.unlocked=g.unlocked.filter(id=>id!=='autumn')]){
  const g=seed();mutate(g);const before=structuredClone(g);assert.throws(()=>buyMallProduct(g,'chichi',item.id,'mall-chichi-1',now));assert.deepEqual(g,before);
 }
 const n=buyMallProduct(seed(),'chichi',item.id,'mall-chichi-1',now);assert.throws(()=>buyMallProduct(n,'chichi',item.id,'mall-chichi-2',now));assert.throws(()=>buyMallProduct(seed(),'chichi',item.id,'mall-chichi-9',now));
});
test('eating consumes the purchased stock once, restores native needs and persists consumption',()=>{
 const g=seed(),food=MALL_PRODUCTS.find(p=>p.use==='eat');g.cat.hunger=70;
 const n=useMallProduct(buyMallProduct(g,'chichi',food.id,'mall-chichi-1',now),'chichi',food.id);
 assert.equal(n.cat.hunger,35);assert.equal(n.jobCity.profiles.chichi.inventory[food.id],undefined);assert.equal(mallStock(n,food.id),food.stock-1);
 const r=reload(n);assert.equal(r.jobCity.profiles.chichi.mall.used[food.id],1);validateMallEconomy(r);assert.throws(()=>useMallProduct(r,'chichi',food.id));
});
test('cached clients cannot erase a paid receipt or unknown product; racing same-wallet payments reject atomically',()=>{
 const base=seed(),paid=buyMallProduct(base,'chichi',item.id,'mall-chichi-1',now),legacy=structuredClone(base);
 delete legacy.jobCity.profiles.chichi.mall;legacy.cat.thought='An old client';
 const n=mergeSharedWorld(base,paid,legacy);assert.equal(n.jobCity.profiles.chichi.inventory[item.id],1);assert.ok(n.jobCity.profiles.chichi.mall.receipts['mall-chichi-1']);
 const other=buyMallProduct(base,'chichi',MALL_PRODUCTS.find(p=>p.use==='eat').id,'mall-chichi-1',now);assert.throws(()=>mergeSharedWorld(base,paid,other));
 const omitted=structuredClone(paid);delete omitted.jobCity.profiles.chichi.mall;delete omitted.jobCity.profiles.chichi.inventory[item.id];
 assert.equal(mergeSharedWorld(paid,paid,omitted).jobCity.profiles.chichi.inventory[item.id],1);
});
