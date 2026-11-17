import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {byBiome} from '../public/game-data.js';
export async function auditManualPaths({page,review,errors,httpErrors}){
 const home=process.env.CHICHI_PATHS_KIND==='home',biome=byBiome(home?'cat-homes':'jobcity');
 await page.locator('[data-biome="'+biome.id+'"]').click();
 await page.evaluate(()=>{__lagoonQA.drawPaused=true;});
 console.log('Native manual path: focus',biome.id);
 const progress=setInterval(async()=>{try{console.log('Loading state',await page.evaluate(()=>{const q=__lagoonQA,h=q.islands.get('cat-homes');return {focused:q.focused(),low:h?.userData.lowOnly,houses:h?.userData.houses?.size,pending:h?.userData.pendingHouses?.size,visible:q.isVisible()};}));}catch{}},15000);
 try{await page.waitForFunction(home?()=>__lagoonQA.islands.get('cat-homes')?.userData.houses?.size>0:()=>['job-bank','job-crypto','job-factory','job-furniture','job-estate','job-cars'].every(id=>__lagoonQA.itemGroups.get(id)?.userData.getManualNavigation),null,{timeout:120000});}finally{clearInterval(progress);}
 console.log('Native manual path: models ready');
 await page.evaluate(async()=>{if(!await __lagoonSaveQA.cloud.claimEditor())throw Error('Private simulation lease unavailable');__lagoonQA.manualFrames=true;});
 const snapshot=()=>page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();return{position:q.chichiCarrier.position.toArray(),active:q.manualWalk().active,failure:q.manualWalk().startFailure,coins:g.coins,inventory:g.inventory,placements:g.placements,housing:g.housing};});
 const initial=await snapshot();await page.locator('#chichi-control').click();assert.equal((await snapshot()).active,true,'actual entry button');
 const trace=[],touch=!!process.env.CHICHI_PATHS_TOUCH_AUDIT,cdp=touch?await page.context().newCDPSession(page):null;
 const press=async key=>{if(!touch)return page.keyboard.down(key);const b=await page.locator('[data-walk-key="'+key+'"]').boundingBox();assert.ok(b&&b.width>=44&&b.height>=44);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});};
 const release=async key=>{if(!touch)return page.keyboard.up(key);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 const walk=async(x,z)=>{const target={x:biome.center[0]+x,z:biome.center[1]+z};let key=null,best=Infinity,stuck=0;
  try{for(let i=0;i<1800;i++){
   const p=await page.evaluate(()=>{const q=__lagoonQA;return{x:q.chichiCarrier.position.x,z:q.chichiCarrier.position.z,heading:Math.atan2(q.look.x-q.camera.position.x,q.look.z-q.camera.position.z)};}),dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);if(distance<.22){trace.push({target,reached:p});return;}
   if(distance<best-.015){best=distance;stuck=0;}else if(++stuck>70)throw Error('Blocked actual route '+JSON.stringify({target,p,distance}));
   const forward=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),side=dx*Math.cos(p.heading)-dz*Math.sin(p.heading),next=Math.abs(forward)>Math.abs(side)?forward>0?'KeyW':'KeyS':side>0?'KeyA':'KeyD';
   if(next!==key){if(key)await release(key);key=next;await press(key);}
   await page.evaluate(n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.pathsClock=Math.max(performance.now(),q.pathsClock||0)+1000/30;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.pathsClock);}finally{q.manualStepping=false;}}},Math.max(1,Math.min(4,Math.floor(distance/.17))));
  }throw Error('Actual walking route timed out');}finally{if(key)await release(key);}
 };
 if(home){const g=initial.housing,h=g.homes[g.residences.chichi];const {housingPlot}=await import('../public/housing-data.js'),p=housingPlot(h.plot);await walk(p.x+3.4,p.z+3.1);assert.ok((await snapshot()).position[1]>.49,'real porch/floor');await walk(p.x+3.4,p.z+7);}
 else{await walk(21,40);await walk(16,40);await walk(0,40);await walk(0,29);assert.ok((await snapshot()).position[1]>.3,'enter the real office');await walk(0,40);}
 await page.evaluate(()=>__lagoonQA.drawFrame());await page.screenshot({path:join(review,home?'home-path.png':'city-path.png')});
 await page.locator('#camera-all').click();assert.equal((await snapshot()).active,false);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry);await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;__lagoonQA.manualFrames=true;});const reloaded=await snapshot();assert.equal(reloaded.active,false);for(const k of ['coins','inventory','placements','housing'])assert.deepEqual(reloaded[k],initial[k]);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'manual-paths.json'),JSON.stringify({home,initial,trace,reloaded,errors,httpErrors,privateSQLite:true,native:true,actualTouch:touch},null,2));console.log('PASS native',home?'home porch, physical entrance and exit':'cross reserved road, actual office entrance and exit','camera release and SQLite reload');
}
