import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function deepSave({page,review}){
 // Explicit private fixture restore exercises the new floor depth and both
 // client/server normalization; no player save or live endpoint is involved.
 const pose={mode:'swimming',x:3520,y:-430,z:618,yaw:Math.PI/2,floor:0,returning:false};
 const initial=await page.evaluate(async pose=>{const s=__lagoonSaveQA,q=__lagoonQA;q.manualWalk().stop();q.drawPaused=true;q.freeze=true;const g=structuredClone(s.getGame()),summary=g=>({coins:g.coins,diamonds:g.diamonds,inventory:g.inventory,placements:g.placements,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins]))});g.mosasaurSubmarine={...g.mosasaurSubmarine,active:false,explorerVersion:1,explorer:pose};delete g.mosasaurSubmarine.released;s.commit(g,false,{snapshotLocations:false});await s.cloud.flush();return summary(s.getGame());},pose);
 async function reload(){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&window.__lagoonSaveQA?.cloud.editable,null,{timeout:240000});return page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();q.drawPaused=true;q.manualFrames=true;q.freeze=false;q.submarine().update(0,7);q.submarine().updateCamera(.1);return{pose:g.mosasaurSubmarine.explorer,runtime:{...q.submarine().explorer},phase:q.submarine().phase,coins:g.coins,diamonds:g.diamonds,inventory:g.inventory,placements:g.placements,profiles:Object.fromEntries(Object.entries(g.jobCity.profiles).map(([id,p])=>[id,p.coins]))};});}
 const first=await reload();assert.equal(first.phase,'swimming');assert(first.runtime.y<-400);for(const k of Object.keys(initial))assert.deepEqual(first[k],initial[k],k);
 const coarse=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),cdp=coarse?await page.context().newCDPSession(page):null;
 if(coarse){const b=await page.locator('.submarine-panel [data-sub-key="KeyW"]').boundingBox();assert(b&&b.width>=44&&b.height>=44&&b.y>=0&&b.y+b.height<=844);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:12}]});}else await page.keyboard.down('KeyW');
 const moved=await page.evaluate(()=>{const q=__lagoonQA,s=q.submarine();for(let i=0;i<30;i++){s.update(.1,7+i*.1);s.updateCamera(.1);}return{...s.explorer};});
 if(coarse)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');
 assert(Math.hypot(moved.x-first.runtime.x,moved.z-first.runtime.z)>10,'held real input moves through the actual deep domain');
 const saved=await page.evaluate(async()=>{const s=__lagoonSaveQA;s.commit({...s.getGame()},false);await s.cloud.flush();return s.getGame().mosasaurSubmarine.explorer;});
 const second=await reload();assert.deepEqual(second.pose,saved);assert(Math.hypot(second.runtime.x-saved.x,second.runtime.z-saved.z)<.01);assert(second.runtime.y<-400);for(const k of Object.keys(initial))assert.deepEqual(second[k],initial[k],k);
 await cdp?.detach();await writeFile(join(review,'deep-private-save.json'),JSON.stringify({initial,first,moved,saved,second,privateSQLite:true,livePlayerDataUsed:false,paidInferenceCalled:false},null,2));console.log('DEEP_PRIVATE_SQLITE_TWO_RELOADS_PASS');
}
