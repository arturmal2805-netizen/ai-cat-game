import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function warehouseSaveRestore({page,review},expected){
 const baseline=await page.evaluate(async()=>{const s=__lagoonSaveQA;s.commit({...s.getGame()},false);await s.cloud.flush();const g=s.getGame();return{location:g.catLocations?.chichi,position:g.catPosition};});
 assert.equal(baseline.location.biome,'autumn');assert(Math.abs(baseline.location.x)<.1&&Math.abs(baseline.location.z-96)<.1,'transient deep visit records the original dry shore');assert(baseline.location.y>0);
 const reloads=[];
 for(let i=0;i<2;i++){
  await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});
  const restored=await page.evaluate(()=>{const q=__lagoonQA,s=__lagoonSaveQA,g=s.getGame();q.freeze=true;q.drawPaused=true;return{coins:g.coins,diamonds:g.diamonds,inventory:g.inventory,placements:g.placements,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins])),location:g.catLocations?.chichi,position:g.catPosition,transientVisits:q.warehouse().runtime.visits.size};});
  for(const key of Object.keys(expected))assert.deepEqual(restored[key],expected[key],key+' after private SQLite reload '+i);assert.deepEqual(restored.location,baseline.location);assert.deepEqual(restored.position,baseline.position);assert.equal(restored.transientVisits,0,'no orphan or duplicate cat/boat visit after reload');reloads.push(restored);
 }
 await writeFile(join(review,'warehouse-private-save-reloads.json'),JSON.stringify({passed:true,baseline,reloads,expected,privateSQLite:true,paidInferenceCalled:false,livePlayerDataUsed:false},null,2));console.log('WAREHOUSE_PRIVATE_SQLITE_TWO_RELOADS_PASS');
}
