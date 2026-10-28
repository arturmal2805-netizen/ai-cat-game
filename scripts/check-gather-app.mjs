import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function checkGatherApp(page,dir){
 await page.waitForFunction(()=>__lagoonSaveQA.cloud.editable&&__lagoonQA.npcs.has('adopt-marshmallow'));
 const setup=await page.evaluate(()=>{
  const q=__lagoonQA,w=__lagoonSaveQA.getWorld();q.freeze=true;w.focus('atoll-park');
  const before={};for(const [id,n]of q.npcs){n.leisureBiome='moon';n.manualAnchor={x:0,z:0};before[id]=n.carrier.position.toArray();}
  // Check the actual button's live work/sleep exclusions, then restore only
  // this private fixture state before resuming native frames.
  q.jobs.states.set('luna',{job:'bank'});q.npcs.get('moti').model.userData.mood='sleep';
  return {before,ids:w.gatherCandidates(),coins:__lagoonSaveQA.getGame().coins};
 });
 assert.ok(!setup.ids.includes('luna'));assert.ok(!setup.ids.includes('moti'));assert.ok(setup.ids.includes('adopt-marshmallow'));
 await page.locator('#island-open').tap();await page.locator('#island-gather').tap();
 const dispatched=await page.evaluate(()=>{
  const q=__lagoonQA;const rows=[...q.npcs].filter(([id])=>id!=='luna'&&id!=='moti').map(([id,n])=>({id,trip:n.gatherTrip,manualUntil:n.manualUntil}));
  q.jobs.states.delete('luna');q.npcs.get('moti').model.userData.mood='happy';q.freeze=false;return rows;
 });
 assert.ok(dispatched.length>=3);for(const row of dispatched){assert.ok(row.trip,row.id);assert.ok(row.trip.duration<=18000);assert.ok(Math.hypot(row.trip.to.x,row.trip.to.z+550)<25);}
 // Saving over the old shore during transit must not undo the invitation.
 await page.waitForTimeout(700);
 const inFlight=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();__lagoonSaveQA.commit(structuredClone(g));return {destinations:__lagoonSaveQA.getGame().catDestinations,positions:[...__lagoonQA.npcs].filter(([,n])=>n.gatherTrip).map(([id,n])=>({id,position:n.carrier.position.toArray()}))};});
 for(const row of dispatched)assert.equal(inFlight.destinations[row.id],'atoll-park',row.id+' save during transit');
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);const acknowledged=await page.evaluate(()=>__lagoonSaveQA.getGame().catDestinations);for(const row of dispatched)assert.equal(acknowledged[row.id],'atoll-park',row.id+' cloud ACK during transit');
 // Wait for actual arrivals, not just a changed destination or 20 cm of motion.
 await page.waitForFunction(ids=>ids.every(id=>{const n=__lagoonQA.npcs.get(id);return !n.gatherTrip&&Math.hypot(n.carrier.position.x,n.carrier.position.z+550)<25;}),dispatched.map(r=>r.id),{timeout:45000});
 await page.waitForTimeout(4000); // Ordinary appetite must not immediately undo the invitation.
 const arrived=await page.evaluate(ids=>({rows:ids.map(id=>{const n=__lagoonQA.npcs.get(id);return {id,position:n.carrier.position.toArray(),biome:n.profile.biome};}),hero:__lagoonQA.chichiCarrier.position.toArray(),coins:__lagoonSaveQA.getGame().coins,contextLost:__lagoonQA.renderer.getContext().isContextLost()}),dispatched.map(r=>r.id));
 assert.equal(arrived.coins,setup.coins);assert.equal(arrived.contextLost,false);assert.ok(Math.hypot(arrived.hero[0],arrived.hero[2]+550)<25);
 for(const r of arrived.rows){assert.equal(r.biome,'atoll-park');assert.ok(Math.abs(r.position[1]-.16)<.001,r.id);}
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=true;q.reviewView(0,-550,34);q.freeze=false;});await page.waitForFunction(()=>Math.abs(__lagoonQA.getDistance()-34)<.5);await page.screenshot({path:dir+'/gather-park-arrived-phone.png'});
 // Repeat from another island, proving that recall replaces rather than
 // accumulates an old trip; cancellation still happens in place.
 const repeated=await page.evaluate(()=>{const q=__lagoonQA,w=__lagoonSaveQA.getWorld();q.freeze=true;w.gather('homestead',['adopt-crumb']);const n=q.npcs.get('adopt-crumb'),first=n.gatherTrip;w.gather('atoll-park',['adopt-crumb']);const second=n.gatherTrip;const distinct=first!==second;const before=n.carrier.position.toArray();w.moveResident('adopt-crumb','atoll-park',{x:5,z:-550});return {distinct,cancelled:!n.gatherTrip,before};});
 assert.equal(repeated.distinct,true);assert.equal(repeated.cancelled,true);
 await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);
 const diagnostics=await page.evaluate(()=>({locations:__lagoonSaveQA.getGame().catLocations,snapshot:__lagoonSaveQA.getWorld().snapshotCatLocations(__lagoonSaveQA.getGame()).catLocations}));await fs.writeFile(dir+'/location-diagnostics.json',JSON.stringify(diagnostics,null,2));
 const saved=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,placements:g.placements,catDestinations:Object.fromEntries(Object.entries(g.catDestinations).filter(([id])=>id!=='luna'&&id!=='moti')),adoption:g.adoption};});
 for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);const restored=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,placements:g.placements,catDestinations:Object.fromEntries(Object.entries(g.catDestinations).filter(([id])=>id!=='luna'&&id!=='moti')),adoption:g.adoption};});assert.deepEqual(restored,saved);const positions=await page.evaluate(ids=>ids.filter(id=>id!=='adopt-crumb').map(id=>(()=>{const q=__lagoonQA,n=q.npcs.get(id),g=__lagoonSaveQA.getGame(),job=q.jobs.get(id),visit=q.residentPlay.get(id);return {id,p:n.carrier.position.toArray(),state:{biome:n.profile.biome,leisure:n.leisureBiome,gather:!!n.gatherTrip,job:job&&{phase:job.phase,position:job.position},visit:visit&&{phase:visit.phase,action:visit.decision?.action},location:g.catLocations[id],hero:q.chichiCarrier.position.toArray(),catPosition:g.catPosition}};})()),dispatched.map(r=>r.id));for(const {id,p,state}of positions)assert.ok(Math.hypot(p[0],p[2]+550)<25,id+' reload must restore the gate, not the island centre '+JSON.stringify({position:p,state,location:diagnostics.locations[id],snapshot:diagnostics.snapshot[id]}));}
 await fs.writeFile(dir+'/gather-app.json',JSON.stringify({setup,dispatched,inFlight,arrived,repeated,reloads:2},null,2));console.log('GATHER: real phone menu, work/sleep exclusions, exact park arrivals, replacement/cancel and two SQLite reloads passed.');
}
