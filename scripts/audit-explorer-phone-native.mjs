import assert from 'node:assert/strict';
// Exercise the visible phone controls with native touch, including release.
export async function auditExplorerPhoneNative({page,advance,snapshot,label}){
 const phone=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches);
 assert.equal(await page.locator('.submarine-panel').isVisible(),phone);
 if(!phone)return {label,phone:false};
 const footer=await page.locator('.world-bottom').boundingBox(),height=await page.evaluate(()=>innerHeight),layout=[];
 for(const b of await page.locator('.submarine-panel button:visible').all()){
  const box=await b.boundingBox();layout.push({label:await b.getAttribute('aria-label'),box});assert.ok(box.y>=0&&box.y+box.height<=height,'phone control must be entirely visible');
  assert.ok(!footer||box.y+box.height<=footer.y-6||box.x+box.width<=footer.x||box.x>=footer.x+footer.width,'phone control must not overlap the inventory/autonomy bar: '+JSON.stringify({label:layout.at(-1).label,box,footer}));
 }
 const cdp=await page.context().newCDPSession(page);
 const hold=async(key,n)=>{
  const box=await page.locator(`[data-sub-key="${key}"]`).boundingBox();assert.ok(box&&box.width>=44&&box.height>=44);
  const point={x:box.x+box.width/2,y:box.y+box.height/2,id:901};
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.dataset.subKey,point),key,'controls must remain unobstructed');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await advance(n);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 try{
  const a=await snapshot();await hold('KeyW',2);const b=await snapshot();assert.ok(Math.hypot(b.explorer.x-a.explorer.x,b.explorer.z-a.explorer.z)>.5);await advance(2);const stop=await snapshot();assert.ok(Math.hypot(stop.explorer.x-b.explorer.x,stop.explorer.z-b.explorer.z)<.02);await hold('KeyS',2);
  const before=await snapshot();await hold('Space',2);assert.ok((await snapshot()).explorer.y>before.explorer.y+.2);
  if(label==='swimming')await hold('ShiftLeft',2);else await advance(20);
  console.log('PASS: visible compact phone buttons, real movement/depth or jump and release',label);return {label,phone:true,buttons:true,completed:true,layout,footer};
 }finally{await cdp.detach();}
}
