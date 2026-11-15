import assert from 'node:assert/strict';
// Actual Chromium touch events on the unadorned game canvas. No invisible DOM
// buttons are clicked: one finger moves, another looks; two left fingers dive.
export async function auditExplorerTouchNative({page,advance,snapshot,label}){
 const points=await page.evaluate(()=>{const c=__lagoonQA.renderer.domElement,b=c.getBoundingClientRect(),out=[];for(const x of [.2,.34,.76]){let found;for(const y of [.55,.45,.65,.35]){const p={x:b.left+b.width*x,y:b.top+b.height*y};if(document.elementFromPoint(p.x,p.y)===c){found=p;break;}}if(!found)throw Error('No free touch area');out.push(found);}return out;});
 const cdp=await page.context().newCDPSession(page);let active=false;const send=async(type,touchPoints)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});active=type==='touchStart'||type==='touchMove';await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));},p=points.map((p,i)=>({...p,id:101+i}));
 try{
  const a=await snapshot();await send('touchStart',[p[0]]);await send('touchStart',[p[0],p[2]]);await send('touchMove',[{...p[0],y:p[0].y-48},{...p[2],x:p[2].x+40}]);await advance(3);const b=await snapshot();assert.ok(Math.hypot(b.explorer.x-a.explorer.x,b.explorer.z-a.explorer.z)>.6);assert.ok(Math.abs(b.view.orbitYaw-a.view.orbitYaw)>.1);
  await send('touchEnd',[]);const stop=await snapshot();await advance(2);const still=await snapshot();assert.ok(Math.hypot(still.explorer.x-stop.explorer.x,still.explorer.z-stop.explorer.z)<.02);
  if(label==='swimming'){
   const before=await snapshot();await send('touchStart',[p[0]]);await send('touchStart',[p[0],p[1]]);await send('touchMove',[{...p[0],y:p[0].y-48},{...p[1],y:p[1].y-48}]);await advance(3);const up=await snapshot();assert.ok(up.explorer.y>before.explorer.y+1);await send('touchMove',[{...p[0],y:p[0].y+48},{...p[1],y:p[1].y+48}]);await advance(3);{const down=await snapshot();assert.ok(down.explorer.y<up.explorer.y-1,JSON.stringify({before:before.explorer,up:up.explorer,down:down.explorer}));}await send('touchEnd',[]);
  }else{
   const before=await snapshot();await send('touchStart',[p[0]]);await send('touchStart',[p[0],p[1]]);await send('touchEnd',[]);await advance(2);assert.ok((await snapshot()).explorer.y>before.explorer.y+.2);await advance(20);
  }
  // Reverse the forward gesture using actual keys, keeping the fixture near
  // the waiting hull/airlock without writing any character coordinates.
  await page.keyboard.down('KeyS');await advance(3);await page.keyboard.up('KeyS');
  console.log('PASS: hidden-control native move/look/vertical or jump gestures',label);return {label,completed:true};
 }finally{if(active)await send('touchCancel',[]);await cdp.detach();}
}
