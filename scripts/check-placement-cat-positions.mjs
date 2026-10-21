import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function checkPlacementCats(page,review){
 const row=await page.evaluate(()=>{
  const q=__lagoonQA,save=__lagoonSaveQA,w=__diamondQA,g=structuredClone(save.getGame());
  q.freeze=true;q.manualFrames=true;q.drawPaused=true;q.cpuOnly=true;
  g.unlocked=['moon','homestead'];g.jobCity=null;g.family=null;g.housing=null;g.catDestinations={};g.placements=[];g.scenery=[];
  g.coins=1000000;g.inventory['slide-titan-funnel']=1;
  save.commit(g);const b=q.islands.get('homestead'),ids=[...q.npcs].filter(([,n])=>n.profile.biome==='homestead'&&!n.profile.venueHome).slice(0,4).map(([id])=>id);
  if(!ids.length)throw Error('Missing test residents');
  for(let i=0;i<ids.length;i++){const n=q.npcs.get(ids[i]);save.getWorld().moveResident(ids[i],'homestead',{x:b.position.x+100+i*.5,z:b.position.z+40});n.manualUntil=0;n.manualAnchor=null;}
  const pose=()=>Object.fromEntries(ids.map(id=>{const p=q.npcs.get(id).carrier.position;return[id,[p.x,p.y,p.z]];})),before=pose();
  const placed=w.placeItem(save.getGame(),'slide-titan-funnel','homestead',100,40,0);
  save.commit(placed);const synchronized=pose();
  q.freeze=false;
  const samples=[],start=performance.now();
  for(let i=0;i<12;i++){q.manualStepping=true;try{q.step(start+i*17);}finally{q.manualStepping=false;}samples.push(pose());}
  q.freeze=true;
  return {ids,before,synchronized,samples};
 });
 assert.deepEqual(row.before,row.synchronized,'placing a building must not reset an existing actor');
 let maximum=0,prev=row.before;
 for(const sample of row.samples){for(const id of row.ids){const a=prev[id],b=sample[id];maximum=Math.max(maximum,Math.hypot(a[0]-b[0],a[2]-b[2]));}prev=sample;}
 fs.writeFileSync(path.join(review,'placement-cat-positions.json'),JSON.stringify({...row,maximum},null,2));
 console.log('PLACEMENT_CATS',JSON.stringify({cats:row.ids.length,maximum}));
 assert.ok(maximum<.55,'new construction must not teleport nearby wanderers to its outer boundary');
}
