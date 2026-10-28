// Production UI + local Worker/SQLite. Only deadlines/travel are advanced in
// this private fixture; purchases, planting, animations, stock and saves are real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {MAGIC_BED_ID,MAGIC_BED_SEEDS,MAGIC_BED_CROPS} from '../public/magic-bed-data.js';
export async function checkMagicBed(page,review){
 page.setDefaultTimeout(180000);
 const state=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),p=g.placements.find(p=>p.item==='farm-magic-fruits');return {coins:g.coins,inventory:g.inventory,stock:g.farm.stock,harvests:g.farm.harvests,field:p&&g.farm.fields[p.id],placement:p};});
 try{
 console.log('MAGIC_BED: actual shop purchase, bag, rotated placement on existing island');
 await page.evaluate(()=>{for(const n of __lagoonQA.npcs.values())n.manualUntil=performance.now()+1e8;});
 await page.locator('#shop-open').tap();await page.locator('[data-product="'+MAGIC_BED_ID+'"]').getByRole('button',{name:/^Купить/}).tap();await page.locator('#build-cancel').tap();
 assert.equal((await state()).inventory[MAGIC_BED_ID],1);
 await page.locator('#bag-open').tap();await page.locator('[data-product="'+MAGIC_BED_ID+'"]').getByRole('button',{name:/^Разместить/}).tap();await page.locator('#build-biome').selectOption('homestead');await page.locator('#build-rotate').tap();await page.locator('#build-confirm').tap();
 let current=await state();const field=current.placement.id;assert.equal(current.placement.rotation,1);assert.equal(current.placement.biome,'homestead');assert.equal(current.coins,993600);assert.equal(current.field.length,12);
 await page.evaluate(id=>{const g=structuredClone(__lagoonSaveQA.getGame());g.placements.find(p=>p.id===id).readyAt=0;__lagoonSaveQA.commit(g,false);const b=__lagoonQA.itemGroups.get(id);__lagoonSaveQA.getWorld().focus('homestead');__lagoonQA.reviewView(b.position.x,b.position.z,23);},field);
 await page.waitForFunction(id=>__lagoonQA.itemGroups.get(id)?.userData.magicBed,field,{timeout:240000});
 assert.equal(await page.evaluate(()=>__lagoonQA.islands.size),18);
 console.log('MAGIC_BED: buy all six seed types separately, choose from bag, plant correct rows');
 await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/Насіння/}).tap();assert.equal(await page.locator('#shop-grid [data-product]').count(),6);
 for(const seed of MAGIC_BED_SEEDS)for(let i=0;i<2;i++)await page.locator('[data-product="'+seed.id+'"]').getByRole('button',{name:/^Купить/}).tap();
 assert.equal((await state()).coins,993600-2*MAGIC_BED_SEEDS.reduce((n,s)=>n+s.price,0));await page.screenshot({path:path.join(review,'magic-seeds-shop.png')});
 await page.getByRole('tab',{name:/сумка/i}).tap();await page.locator('[data-product="magic-seed-cotton"]').getByRole('button',{name:'Посадити'}).tap();
 assert.equal(await page.locator('#farm-field').inputValue(),field);assert.equal(await page.locator('.magic-bed-row').count(),6);assert.equal(await page.locator('[data-cell="2"] button').isDisabled(),true);
 for(const [row,seed]of MAGIC_BED_SEEDS.entries()){
   await page.locator('#farm-seed').selectOption(seed.id);
   for(let i=0;i<2;i++)await page.locator('[data-cell="'+(row*2+i)+'"] button').tap();
 }
 current=await state();for(const [row,seed]of MAGIC_BED_SEEDS.entries()){assert.equal(current.inventory[seed.id],0);for(let i=0;i<2;i++)assert.equal(current.field[row*2+i].crop,seed.seedCrop);}
 await page.screenshot({path:path.join(review,'magic-bed-growth-panel.png')});await page.locator('[data-close="farm-dialog"]').tap();
 console.log('MAGIC_BED: six growth stages, fixed buffers and full-resolution images');
 const versions=await page.evaluate(id=>{const q=__lagoonQA,g=q.itemGroups.get(id);q.reviewView(g.position.x,g.position.z,19);return g.children.filter(c=>c.isInstancedMesh).map(c=>({name:c.name,version:c.geometry.getAttribute('magicPlantTime').version,matrix:c.instanceMatrix.version}));},field);
 const stageStats=[];
 for(const progress of [0,.12,.3,.5,.75,1]){
  await page.evaluate(({id,progress})=>{const g=structuredClone(__lagoonSaveQA.getGame()),now=Date.now();for(const cell of g.farm.fields[id]){cell.plantedAt=now-600000*progress;cell.readyAt=cell.plantedAt+600000;}__lagoonSaveQA.commit(g,false);__lagoonQA.itemGroups.get(id).userData.update();},{id:field,progress});
  await page.waitForTimeout(900);await page.screenshot({path:path.join(review,'growth-'+progress+'.png')});
  stageStats.push(await page.evaluate(({id,progress})=>{const q=__lagoonQA,g=q.itemGroups.get(id);return {progress,draws:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,parts:g.children.filter(c=>c.isInstancedMesh&&c.visible).map(c=>c.name)};},{id:field,progress}));
 }
 assert.ok(!stageStats[0].parts.some(s=>s.endsWith('fruit')));assert.ok(stageStats.at(-1).parts.some(s=>s.endsWith('fruit')));
 console.log('MAGIC_BED: hero sniff/reach/pluck/basket, immediate +2 stock');
 await page.locator('#farm-open').tap();await page.locator('#farm-field').selectOption(field);await page.locator('[data-cell="0"] button').tap();
 await page.waitForFunction(()=>!!__lagoonQA.getOperation()?.harvester);await page.evaluate(()=>{const op=__lagoonQA.getOperation();if(op.stage==='travel')op.start=performance.now()-op.duration-20;});
 await page.waitForFunction(()=>__lagoonQA.getOperation()?.harvester?.picked,{},{timeout:240000});
 await page.evaluate(id=>{const g=__lagoonQA.itemGroups.get(id);__lagoonQA.reviewView(g.position.x,g.position.z,21);},field);await page.waitForTimeout(700);await page.screenshot({path:path.join(review,'chichi-picking.png')});
 await page.waitForFunction(()=>__lagoonSaveQA.getGame().farm.stock['magic-fruit-cotton']===2,{},{timeout:240000});
 current=await state();assert.equal(current.field[0].crop,null);assert.equal(current.field[0].cycle,1);assert.equal(current.inventory['magic-fruit-cotton'],undefined);
 console.log('MAGIC_BED: tiny/giant cats collect separate rows without stealing one fruit');
 await page.evaluate(id=>{const q=__lagoonQA,bed=q.itemGroups.get(id);for(const [id,n]of q.npcs)if(!['adopt-crumb','adopt-marshmallow'].includes(id)){n.carrier.position.set(bed.position.x+60+n.index*3,.16,bed.position.z+40);n.manualAnchor={x:n.carrier.position.x,z:n.carrier.position.z};n.manualUntil=performance.now()+1e8;}for(const [i,cat]of ['adopt-crumb','adopt-marshmallow'].entries()){const n=q.npcs.get(cat);n.manualUntil=performance.now()+1e8;__lagoonSaveQA.getWorld().moveResident(cat,'homestead',{x:bed.position.x+(i?13:-13),z:bed.position.z+12});}const g=structuredClone(__lagoonSaveQA.getGame());for(const id of ['luna','moti'])g.catDestinations[id]='moon';__lagoonSaveQA.commit(g,false);},field);
 const plans=[];for(const [cat,cell]of [['adopt-crumb',4],['adopt-marshmallow',10]]){
  assert.equal(await page.evaluate(({cat,cell,id})=>__lagoonQA.performResident(cat,{action:'farm',activityId:id,bedCell:cell,mood:'happy',thought:'Збираю!'}),{cat,cell,id:field}),true,cat);
  plans.push(await page.evaluate(cat=>{const p=__lagoonQA.residentPlay.get(cat).harvester;return {cat,radius:p.radius,entry:p.entry,slot:p.slot};},cat));
  await page.evaluate(cat=>{const v=__lagoonQA.residentPlay.get(cat);v.started=performance.now()-v.travel-20;},cat);
 }
 assert.notEqual(plans[0].slot.row,plans[1].slot.row);
 await page.evaluate(id=>{const g=__lagoonQA.itemGroups.get(id);__lagoonQA.reviewView(g.position.x,g.position.z,23);},field);
 await page.waitForFunction(()=>['adopt-crumb','adopt-marshmallow'].every(id=>__lagoonQA.residentPlay.get(id)?.harvester?.picked),{},{timeout:240000});await page.screenshot({path:path.join(review,'tiny-and-giant-picking.png')});
 await page.waitForFunction(()=>__lagoonSaveQA.getGame().farm.harvests===6,{},{timeout:240000});
 console.log('MAGIC_BED: interruption keeps ripe fruit and stock; restart keeps exact cells/deadlines');
 assert.equal(await page.evaluate(id=>__lagoonQA.performResident('adopt-crumb',{action:'farm',activityId:id,mood:'happy',thought:'Збираю!'}),field),true);
 await page.evaluate(()=>{const v=__lagoonQA.residentPlay.get('adopt-crumb');v.started=performance.now()-v.travel-20;});await page.waitForFunction(()=>__lagoonQA.residentPlay.get('adopt-crumb')?.harvester?.picked);
 const cancelledCell=await page.evaluate(()=>{const v=__lagoonQA.residentPlay.get('adopt-crumb'),index=v.harvester.slot.index;__lagoonQA.residentPlay.cancel('adopt-crumb');return index;});current=await state();assert.equal(current.harvests,6);assert.ok(current.field[cancelledCell].crop);
 console.log('MAGIC_BED: autonomous nearby cat chooses a ripe plant without an AI request');
 await page.evaluate(id=>{const q=__lagoonQA,n=q.npcs.get('adopt-crumb'),g=structuredClone(__lagoonSaveQA.getGame());g.care.residents['adopt-crumb'].hunger=5;g.care.residents['adopt-crumb'].energy=95;__lagoonSaveQA.commit(g,false);n.manualUntil=0;q.pauseHarvestAutonomy=false;},field);
 await page.waitForFunction(()=>__lagoonQA.residentPlay.get('adopt-crumb')?.autonomous,{},{timeout:120000});console.log('MAGIC_BED: autonomous harvest started');
 await page.waitForFunction(()=>__lagoonSaveQA.getGame().farm.harvests>=8,{},{timeout:240000});
 await page.evaluate(()=>{__lagoonQA.pauseHarvestAutonomy=true;for(const [id,v]of [...__lagoonQA.residentPlay.visits])if(v.autonomous)__lagoonQA.residentPlay.cancel(id);for(const n of __lagoonQA.npcs.values())n.manualUntil=performance.now()+1e8;});
 await page.locator('#farm-open').tap();await page.screenshot({path:path.join(review,'harvest-stock.png')});assert.match(await page.locator('#farm-stock-text').innerText(),/×2/);await page.locator('[data-close="farm-dialog"]').tap();
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 const saved=await state();for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);await page.evaluate(()=>{for(const n of __lagoonQA.npcs.values())n.manualUntil=performance.now()+1e8;});assert.deepEqual(await state(),saved);}
 fs.writeFileSync(path.join(review,'magic-bed.json'),JSON.stringify({islands:18,dpr:2,field,versions,stageStats,plans,saved,reloads:2,renderer:'Chromium SwiftShader; UI and correctness, not physical device FPS'},null,2));console.log('MAGIC_BED: purchase, bag, rotation, 12 plants, growth, hero/tiny/giant, interruption, stock and two SQLite reloads passed.');
 }catch(e){const debug=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame(),n=q.npcs.get('adopt-crumb'),bed=[...q.itemGroups.values()].find(o=>o.userData.magicBed);return {focused:q.focused(),lowOnly:q.islands.get(q.focused())?.userData.lowOnly,pause:q.pauseHarvestAutonomy,dialog:!!document.querySelector('dialog[open]'),op:q.getOperation()?.stage,position:n?.carrier.position.toArray(),biome:n?.profile.biome,manual:n?.manualUntil,perf:performance.now(),needs:g.care.residents['adopt-crumb'],job:q.jobs.has('adopt-crumb'),visit:q.residentPlay.get('adopt-crumb')&&{phase:q.residentPlay.get('adopt-crumb').phase,clock:q.residentPlay.get('adopt-crumb').harvester?.clock},available:bed?.userData.harvests?.available(),plants:bed&&g.farm.fields[bed.userData.placementId],stock:g.farm.stock};});fs.writeFileSync(path.join(review,'failure.json'),JSON.stringify(debug,null,2));await page.screenshot({path:path.join(review,'failure.png')}).catch(()=>{});throw e;}
}
