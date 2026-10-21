import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function checkConsolidatedCamera(page,review){
 const rows=[];
 for(const id of ['homestead','aquarium','moon']){
  await page.evaluate(id=>{const w=__lagoonSaveQA.getWorld();w.focus(id);w.islandOverview();},id);
  await page.waitForFunction(()=>{const q=__lagoonQA;return Math.abs(q.getDistance()-q.getDesiredDistance())<.05;});
  const before=await page.evaluate(()=>{const q=__lagoonQA;return {distance:q.getDistance(),desired:q.getDesiredDistance(),far:q.camera.far,focus:q.focused(),contextLost:q.renderer.getContext().isContextLost()};});
  await page.evaluate(()=>{const q=__lagoonQA;q.renderer.domElement.dispatchEvent(new WheelEvent('wheel',{deltaY:-20,bubbles:true,cancelable:true}));});
  const after=await page.evaluate(()=>({distance:__lagoonQA.getDistance(),desired:__lagoonQA.getDesiredDistance()}));
  assert.equal(before.focus,id); assert.equal(before.contextLost,false);
  assert.ok(Math.abs(after.desired-(before.desired-.5))<1e-6,'first wheel must retain a smooth overview distance');
  assert.ok(before.far>before.distance);
  rows.push({id,before,after});
  await page.screenshot({path:path.join(review,`overview-${id}.png`)});
 }
 await page.evaluate(()=>__lagoonSaveQA.getWorld().overview());
 await page.waitForFunction(()=>{const q=__lagoonQA;return Math.abs(q.getDistance()-q.getDesiredDistance())<.05;});
 const overview=await page.evaluate(()=>{const q=__lagoonQA;return {distance:q.getDistance(),far:q.camera.far,contextLost:q.renderer.getContext().isContextLost()};});
 assert.ok(overview.far>overview.distance+300);assert.equal(overview.contextLost,false);
 rows.push({id:'world',...overview});
 await page.screenshot({path:path.join(review,'overview-world.png')});
 const retired=['lotus','crystal','mushrooms','desert','beach','aquapark','rainbow','nature','bamboo','dusk','stars','coral','clouds'];
 const live=await page.evaluate(()=>({menu:[...document.querySelectorAll('[data-biome]')].map(n=>n.dataset.biome),scene:[...__lagoonQA.islands.keys()]}));
 assert.equal(live.menu.length,17);assert.equal(live.scene.length,17);
 for(const id of retired){assert.ok(!live.menu.includes(id));assert.ok(!live.scene.includes(id));}
 fs.writeFileSync(path.join(review,'camera-and-map.json'),JSON.stringify({rows,live},null,2));
 console.log('CONSOLIDATED_CAMERA',JSON.stringify({rows,live}));
}
