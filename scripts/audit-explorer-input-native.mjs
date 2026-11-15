import assert from 'node:assert/strict';

// Real DOM keyboard/pointer events drive the production runtime. Positions are
// observed, never corrected by this input audit; paired inputs walk back.
export async function auditExplorerInputNative({page,advance,snapshot,label}){
 const rows=[];
 const position=async()=>{const s=await snapshot();return {...s.explorer,heading:s.view.yaw};};
 const still=async reason=>{const a=await position();await advance(2);const b=await position();assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<.02,label+' '+reason);};
 const press=async codes=>{const a=await position();for(const code of codes)await page.keyboard.down(code);await advance(2);for(const code of codes)await page.keyboard.up(code);const b=await position();const forward=(b.x-a.x)*Math.sin(a.heading)+(b.z-a.z)*Math.cos(a.heading),side=(b.x-a.x)*Math.cos(a.heading)-(b.z-a.z)*Math.sin(a.heading);rows.push({codes,a,b,forward,side});await still('keyup stops '+codes.join('+'));return {forward,side};};
 assert.ok((await press(['KeyW'])).forward>.5);assert.ok((await press(['KeyS'])).forward<-.5);
 assert.ok((await press(['KeyA'])).side>.5);assert.ok((await press(['KeyD'])).side<-.5);
 const diagonal=await press(['KeyW','KeyA']);assert.ok(diagonal.forward>.3&&diagonal.side>.3);await press(['KeyS','KeyD']);
 await page.keyboard.down('KeyW');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await still('window blur');await page.keyboard.up('KeyW');
 await page.evaluate(()=>{const e=document.createElement('input');e.id='explorer-input-audit';e.style.cssText='position:fixed;top:0;left:0;z-index:99999';document.body.append(e);});
 await page.keyboard.down('KeyW');await page.locator('#explorer-input-audit').focus();await still('focus clears held movement');await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyW');await still('typing does not move cat');await page.keyboard.up('KeyW');await page.locator('#explorer-input-audit').evaluate(e=>e.remove());
 console.log('Explorer native input passed',label);return {label,rows};
}
