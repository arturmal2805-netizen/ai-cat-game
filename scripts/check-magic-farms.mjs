import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {MAGIC_FARMS} from '../public/magic-farms-data.js';
export async function checkMagicFarms(page,review){
 const monitor=setInterval(()=>page.evaluate(()=>{const q=window.__lagoonQA,op=q?.getOperation(),h=op?.harvester;return {stage:op?.stage,clock:h?.clock,duration:h?.duration,picked:h?.picked,position:q?.chichiCarrier.position.toArray(),harvests:window.__lagoonSaveQA?.getGame().farm.harvests,residents:['adopt-crumb','adopt-marshmallow'].map(id=>{const v=q?.residentPlay.get(id);return {id,phase:v?.phase,clock:v?.harvester?.clock,duration:v?.harvester?.duration};})};}).then(s=>console.log('MAGIC_FARMS_PROGRESS',JSON.stringify(s))).catch(()=>{}),20000);
 try{return await checkFarmLogic(page,review);}catch(error){await page.screenshot({path:path.join(review,'farm-failure-phone.png')}).catch(()=>{});throw error;}finally{clearInterval(monitor);}
}
async function checkFarmLogic(page,review){
 page.setDefaultTimeout(180000);const purchases=[];console.log('MAGIC_FARMS: real phone shop and four independent purchases');
 for(const f of MAGIC_FARMS){
  await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Магічні ферми/}).tap();assert.equal(await page.locator('#shop-grid [data-product]').count(),4);
  const card=page.locator('[data-product="'+f.id+'"]'),buy=card.getByRole('button',{name:/^Открыть/}),before=await page.evaluate(()=>__lagoonSaveQA.getGame().coins);assert.match(await buy.innerText(),/Открыть/);await buy.tap();
  const after=await page.evaluate(id=>({coins:__lagoonSaveQA.getGame().coins,owned:__lagoonSaveQA.getGame().unlocked.includes(id),plants:Object.keys(__lagoonSaveQA.getGame().farm.orchards[id].plants).length}),f.id);assert.equal(before-after.coins,f.price);assert.equal(after.owned,true);assert.equal(after.plants,18);purchases.push({id:f.id,price:f.price,...after});
 }
 const f=MAGIC_FARMS[0];await page.evaluate(id=>__lagoonSaveQA.getWorld().focus(id),f.id);
 await page.waitForFunction(id=>{const d=__lagoonQA.islands.get(id).userData;return !d.lowOnly&&d.detail.visible;},f.id,{timeout:240000});
 const visible=await page.evaluate(()=>[...__lagoonQA.islands.values()].filter(g=>g.userData.magicFarm&&g.userData.detail.visible).length);assert.equal(visible,1);
 const rendered=await page.evaluate(()=>({calls:__lagoonQA.renderer.info.render.calls,triangles:__lagoonQA.renderer.info.render.triangles,dpr:__lagoonQA.renderer.getPixelRatio(),farms:[...__lagoonQA.islands.values()].filter(g=>g.userData.magicFarm).map(g=>({id:g.userData.magicFarm,lowOnly:g.userData.lowOnly,visible:g.userData.detail.visible,stats:g.userData.stats}))}));
 await page.screenshot({path:path.join(review,'farm-island-phone.png')});
 await page.locator('#farm-open').tap();assert.equal(await page.locator('#magic-farm-owned [data-farm]').count(),4);await page.screenshot({path:path.join(review,'farm-counters-phone.png')});
 console.log('MAGIC_FARMS: Chichi harvest through the normal farm button');
 const before=await page.evaluate(()=>__lagoonSaveQA.getGame().farm.harvests);
 await page.locator('[data-farm="'+f.id+'"] button').filter({hasText:'Чічі, зібрати'}).tap();
 await page.waitForFunction(()=>!!__lagoonQA.getOperation()?.harvester);
 // Only skip long inter-island travel; the complete field walk/reach/pick/
 // carry/deposit animation below uses the actual production clock.
 await page.evaluate(()=>{const op=__lagoonQA.getOperation();if(op.stage==='travel')op.start=performance.now()-op.duration-20;});
 await page.waitForFunction(()=>{const p=__lagoonQA.getOperation()?.harvester;return p?.picked;},{},{timeout:240000});
 const harvesting=await page.evaluate(()=>{const q=__lagoonQA,p=q.getOperation().harvester,g=q.itemGroups.get(q.getOperation().decision.activityId);return {plant:p.plant.id,fruit:p.fruit.id,clock:p.clock,duration:p.duration,carrying:g.children.filter(x=>x.visible&&x.isGroup).length,position:q.chichiCarrier.position.toArray()};});
 await page.evaluate(()=>{const q=__lagoonQA,p=q.chichiCarrier.position;q.reviewView(p.x,p.z,17);});await page.waitForTimeout(800);
 await page.screenshot({path:path.join(review,'farm-picking-phone.png')});
 await page.waitForFunction(n=>__lagoonSaveQA.getGame().farm.harvests===n+1,before,{timeout:240000});assert.equal(harvesting.carrying,1);
 console.log('MAGIC_FARMS: tiny and giant approved cats reserve different plants');
 await page.evaluate(id=>{
  const q=__lagoonQA,g=structuredClone(__lagoonSaveQA.getGame());g.catDestinations['adopt-crumb']=g.catDestinations['adopt-marshmallow']=id;__lagoonSaveQA.commit(g,false);
  const b=q.islands.get(id);for(const [i,cat]of ['adopt-crumb','adopt-marshmallow'].entries()){__lagoonSaveQA.getWorld().moveResident(cat,id,{x:b.position.x+(i?10:-10),z:b.position.z+72});q.npcs.get(cat).manualUntil=performance.now()+1e7;}
 },f.id);
 const residents=['adopt-crumb','adopt-marshmallow'];for(const cat of residents)assert.equal(await page.evaluate(({cat,id})=>__lagoonQA.performResident(cat,{action:'farm',activityId:'orchard-'+id,mood:'happy',thought:'Зберу врожай!'}),{cat,id:f.id}),true,cat);
 const plants=await page.evaluate(cats=>cats.map(id=>__lagoonQA.residentPlay.get(id).harvester.plant.id),residents);assert.equal(new Set(plants).size,2);
 await page.evaluate(()=>{const q=__lagoonQA;for(const id of ['adopt-crumb','adopt-marshmallow']){const v=q.residentPlay.get(id);v.started=performance.now()-v.travel-20;q.npcs.get(id).manualUntil=performance.now()+1e7;}});
 await page.waitForFunction(n=>__lagoonSaveQA.getGame().farm.harvests===n+3,before,{timeout:240000});
 await page.locator('#farm-open').tap();assert.match(await page.locator('[data-farm="'+f.id+'"] p').innerText(),/Зібрано: 3/);await page.locator('[data-close="farm-dialog"]').tap();
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 const saved=await page.evaluate(()=>({orchards:__lagoonSaveQA.getGame().farm.orchards,stock:__lagoonSaveQA.getGame().farm.stock,coins:__lagoonSaveQA.getGame().coins,unlocked:__lagoonSaveQA.getGame().unlocked}));
 for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);const next=await page.evaluate(()=>({orchards:__lagoonSaveQA.getGame().farm.orchards,stock:__lagoonSaveQA.getGame().farm.stock,coins:__lagoonSaveQA.getGame().coins,unlocked:__lagoonSaveQA.getGame().unlocked}));assert.deepEqual(next,saved);}
 fs.writeFileSync(path.join(review,'magic-farms.json'),JSON.stringify({purchases,visible,rendered,harvesting,residentPlants:plants,harvests:3,reloads:2,dpr:2,contextLost:await page.evaluate(()=>__lagoonQA.renderer.getContext().isContextLost())},null,2));console.log('MAGIC_FARMS: shop, four payments, real harvest/carry/deposit, tiny/giant reservations and two SQLite reloads passed.');
}
