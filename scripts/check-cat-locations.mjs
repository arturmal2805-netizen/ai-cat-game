import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function checkCatLocations(page,review){
 const rows=[];
 for(let reload=0;reload<5;reload++){
  if(reload){
    await page.evaluate(async()=>{await __lagoonSaveQA.cloud.flush();await __lagoonSaveQA.cloud.releaseEditor();});
    await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&window.__lagoonSaveQA?.cloud.editable);
  }
  const row=await page.evaluate(()=>{
   const q=__lagoonQA,g=__lagoonSaveQA.getGame(),ids=Object.keys(g.catLocations),result=[];
   for(const id of ids){
    const p=g.catLocations[id],carrier=id==='chichi'?q.chichiCarrier:q.npcs.get(id)?.carrier,b=q.islands.get(p.biome);
    if(!carrier||!b)throw Error('Missing saved cat/island');
    result.push({id,x:carrier.position.x-b.position.x,y:carrier.position.y,z:carrier.position.z-b.position.z,yaw:carrier.rotation.y,
      expected:{x:p.x,y:p.y,z:p.z,yaw:p.yaw}});
   }
   const snapshot=__lagoonSaveQA.getWorld().snapshotCatLocations(g,g);
   if(Object.keys(snapshot.catLocations).length<ids.length)throw Error('Position capture dropped cats');
   return {cats:result,coins:g.coins,homes:JSON.stringify(g.housing),families:JSON.stringify(g.family)};
  });
  assert.ok(row.cats.length>=5);
  for(const p of row.cats)for(const key of ['x','y','z','yaw'])assert.ok(Math.abs(p[key]-p.expected[key])<1e-8,`${p.id}: ${key}`);
  rows.push({reload,...row});
 }
 fs.writeFileSync(path.join(review,'cat-location-reloads.json'),JSON.stringify(rows,null,2));
 console.log('CAT_LOCATIONS',JSON.stringify({reloads:rows.length,cats:rows.at(-1).cats.length,exact:true}));
}
