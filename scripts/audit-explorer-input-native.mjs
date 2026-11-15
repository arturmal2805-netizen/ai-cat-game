import assert from 'node:assert/strict';

// Real DOM keyboard/pointer events drive the production runtime. Positions are
// observed, never corrected by this input audit; paired inputs walk back.
export async function auditExplorerInputNative({page,advance,snapshot,label}){
 const rows=[];
 const position=async()=>({...((await snapshot()).explorer)});
 const still=async reason=>{const a=await position();await advance(2);const b=await position();assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<.02,label+' '+reason);};
 const press=async codes=>{const a=await position();for(const code of codes)await page.keyboard.down(code);await advance(2);for(const code of codes)await page.keyboard.up(code);const b=await position();const forward=(b.x-a.x)*Math.sin(a.yaw)+(b.z-a.z)*Math.cos(a.yaw),side=(b.x-a.x)*Math.cos(a.yaw)-(b.z-a.z)*Math.sin(a.yaw);rows.push({codes,a,b,forward,side});await still('keyup stops '+codes.join('+'));return {forward,side};};
 assert.ok((await press(['KeyW'])).forward>.5);assert.ok((await press(['KeyS'])).forward<-.5);
 assert.ok((await press(['KeyA'])).side>.5);assert.ok((await press(['KeyD'])).side<-.5);
 const diagonal=await press(['KeyW','KeyA']);assert.ok(diagonal.forward>.3&&diagonal.side>.3);await press(['KeyS','KeyD']);
 await page.keyboard.down('KeyW');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await still('window blur');await page.keyboard.up('KeyW');
 await page.evaluate(()=>{const e=document.createElement('input');e.id='explorer-input-audit';e.style.cssText='position:fixed;top:0;left:0;z-index:99999';document.body.append(e);});
 await page.keyboard.down('KeyW');await page.locator('#explorer-input-audit').focus();await still('focus clears held movement');await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyW');await still('typing does not move cat');await page.keyboard.up('KeyW');await page.locator('#explorer-input-audit').evaluate(e=>e.remove());
 for(const [key,axis,sign] of [['KeyW','forward',1],['KeyS','forward',-1],['KeyA','side',1],['KeyD','side',-1],...(label==='swimming'?[['Space','vertical',1],['ShiftLeft','vertical',-1]]:[])]){
  const button=page.locator('[data-sub-key="'+key+'"]'),box=await button.boundingBox();assert.ok(box);const a=await position();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await advance(2);await page.mouse.up();const b=await position();const delta=axis==='vertical'?b.y-a.y:axis==='forward'?(b.x-a.x)*Math.sin(a.yaw)+(b.z-a.z)*Math.cos(a.yaw):(b.x-a.x)*Math.cos(a.yaw)-(b.z-a.z)*Math.sin(a.yaw);assert.ok(delta*sign>.5,label+' mobile '+key);if(axis==='vertical'){const y=b.y;await advance(2);assert.ok(Math.abs((await position()).y-y)<.02);} await still('mobile button release '+key);
 }
 console.log('Explorer native input passed',label);return {label,rows};
}
