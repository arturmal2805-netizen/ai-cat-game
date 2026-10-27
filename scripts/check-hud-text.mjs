import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function checkHudText(page,review){
  await page.waitForFunction(()=>__lagoonQA.frames>3&&__lagoonQA.shaderWarmup.idle(),null,{timeout:240000});
  const result=await page.evaluate(()=>{
    const q=__lagoonQA;q.freeze=true;
    const render=__lagoonSaveQA.renderHUD,clock=Date.now,now=clock(),rows=[];let referenceMarkup;
    Date.now=()=>now;
    const count=legacy=>{
      globalThis.__qaLegacyTextWrites=legacy;render();
      const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,characterData:true});
      const at=performance.now();for(let i=0;i<40;i++)render();const ms=performance.now()-at;
      const changes=observer.takeRecords();observer.disconnect();
      const markup=document.body.innerHTML;referenceMarkup??=markup;
      return {legacy,ms,mutations:changes.length,markupIdentical:markup===referenceMarkup,text:[...document.querySelectorAll('#coins,#diamonds,#level-number,#level-title,#food-text,#bowl-count')].map(e=>[e.id,e.textContent])};
    };
    try{for(const legacy of [true,false,false,true])rows.push(count(legacy));}
    finally{Date.now=clock;globalThis.__qaLegacyTextWrites=false;}
    return {rows,dpr:q.renderer.getPixelRatio(),contextLost:q.renderer.getContext().isContextLost()};
  });
  fs.writeFileSync(path.join(review,'hud-text.json'),JSON.stringify(result,null,2));
  assert.equal(result.dpr,2);assert.equal(result.contextLost,false);
  for(const r of result.rows){assert.deepEqual(r.text,result.rows[0].text);assert.equal(r.markupIdentical,true);if(r.legacy)assert.ok(r.mutations>500);else assert.equal(r.mutations,0);}
  await page.screenshot({path:path.join(review,'hud-unchanged.png')});
  console.log('HUD_TEXT',JSON.stringify(result));
}
