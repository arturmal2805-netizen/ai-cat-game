// Real application, approved rigs/native work routes, mocked forecast, private SQLite.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import assert from 'node:assert/strict';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';import{build}from'esbuild';import{localQAWorker}from'./local-qa-worker.mjs';
import{newGame}from'../public/economy.js';import{ensureJobCity,localJobPlan,applyJobPlan}from'../public/jobcity-system.js';import{reserveCryptoAttempt,CRYPTO_RULES,cryptoMarketEvent}from'../public/crypto-trading.js';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright'),review=process.env.CHICHI_REVIEW_DIR||path.join(os.tmpdir(),'chichi-crypto-app');await fs.mkdir(review,{recursive:true});
const now=Date.now(),epoch=now-7*1440000;let game=newGame(now);game.unlocked=['moon','jobcity'];game.progression.xp=10000;game=ensureJobCity(game,now);game.jobCity.epoch=epoch;
const ids=Object.keys(game.jobCity.profiles).slice(0,6);for(const p of Object.values(game.jobCity.profiles)){p.profession=ids.includes(p.id)?'crypto':'bank';p.professionSource='ai';p.professionSinceDay=0;p.careerAIPending=false;}const plan=localJobPlan(Object.values(game.jobCity.profiles),7);for(const a of plan){a.job=ids.includes(a.id)?'crypto':'rest';a.evening='rest';}
game=applyJobPlan(game,plan,7,'local');game.jobCity.eveningAIRequestedDay=game.jobCity.eveningAIAppliedDay=7;
for(const p of Object.values(game.jobCity.profiles)){p.profession=ids.includes(p.id)?'crypto':'bank';p.professionSinceDay=0;p.professionSource='ai';p.careerAIPending=false;p.coins=5000;p.investments={version:1,lastAttemptDay:-1,nextAttemptDay:99999,totalPNL:0,current:null,history:[]};}
const rallyAudit=!!process.env.CHICHI_CRYPTO_RALLY_AUDIT;
let trader=null;
for(let shift=0;shift<(rallyAudit?1000:1)&&!trader;shift++){
 game.jobCity.epoch=epoch-shift;
 for(const id of ids){
  const candidate=structuredClone(game);candidate.jobCity.profiles[id].investments.nextAttemptDay=7;
  const r=reserveCryptoAttempt(candidate,now);
  if(r.request&&(!rallyAudit||cryptoMarketEvent(r.request.attemptId))){trader=id;break;}
 }
}
assert.ok(trader,'Fixture must contain a willing trader with a real deterministic event when requested');
const token=crypto.randomBytes(32).toString('hex'),headers={'Content-Type':'application/json','X-Chichi-Save-Token':token},local=await localQAWorker(root);let browser,qaPage;
try{
 const stored=await(await fetch(local.base+'/api/save',{method:'PUT',headers,body:JSON.stringify({expectedRevision:0,mutationId:crypto.randomUUID(),game})})).json();assert.equal(stored.revision,1);
 const output=await build({entryPoints:[path.join(root,'public/app.js')],bundle:true,format:'esm',write:false,define:{__CHICHI_SCULPT_VERSION__:JSON.stringify('crypto-private-qa')},plugins:[{name:'private-crypto-qa',setup(b){
  b.onLoad({filter:/\/public\/app\.js$/},async()=>({loader:'js',contents:(await fs.readFile(path.join(root,'public/app.js'),'utf8')).replace('persist();\nrenderGame();',`window.__cryptoSave={getGame:()=>game,commit,world,cloud,open:()=>cityUI.open(),start:async id=>{const n=structuredClone(game);n.jobCity.profiles[id].investments.nextAttemptDay=7;commitCrypto(n);await cryptoTick();}};\npersist();\nrenderGame();`)}));
  b.onLoad({filter:/\/public\/world\.js$/},async()=>({loader:'js',contents:(await fs.readFile(path.join(root,'public/world.js'),'utf8')).replace('  return {\n    perform,',`window.__cryptoQA={jobs,itemGroups,islands,npcs,camera,renderer,scene,cat,chichiCarrier,step:seconds=>{const actors=${JSON.stringify(ids)}.map(id=>({id,local:jobs.get(id)?.position||{x:0,y:.32,z:-10.3},biome:'jobcity'}));for(let i=0;i<seconds*30;i++)jobs.step(game,actors,1/30,i/30);for(const a of actors){const v=jobs.get(a.id);if(!v)continue;const carrier=a.id==='chichi'?chichiCarrier:npcs.get(a.id)?.carrier;if(carrier)carrier.position.set(JOB_CITY_CENTER[0]+v.position.x,v.position.y+.8,JOB_CITY_CENTER[1]+v.position.z);}},capture:()=>{gpuFrames.clear();renderer.render(scene,camera);}};\n  return {\n    perform,`)}));
 }}]});
 const browserEnv={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete browserEnv[key];browserEnv.NO_PROXY='127.0.0.1,localhost';
 const engine=process.env.CHICHI_BROWSER==='webkit'?webkit:chromium;browser=await engine.launch(process.env.CHICHI_BROWSER==='webkit'?{env:{...browserEnv,LIBGL_ALWAYS_SOFTWARE:'1'}}:{env:browserEnv,executablePath:process.env.CHICHI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=qaPage=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});page.setDefaultTimeout(180000);const errors=[],navigationErrors=[],calls=new Map();let navigating=false;
 page.on('pageerror',e=>{
  // WebKit reports cancellation of the departing document's Blob/fetch work
  // as access-control errors on reload. Keep that evidence separately; never
  // hide an active-document failure or any other bootstrap/runtime exception.
  if(navigating&&/due to access control checks\.$/.test(e.message))navigationErrors.push({message:e.message,stack:e.stack});
  else {errors.push(e.message);console.error('ACTIVE_PAGE_ERROR',e.message);}
 });
 await page.addInitScript(({game,token})=>{if(!localStorage.getItem('chichi-world-v2')){localStorage.setItem('chichi-world-v2',JSON.stringify(game));localStorage.setItem('chichi-recovery-code',token);localStorage.setItem('chichi-cloud-save',JSON.stringify({token,revision:1,dirty:false}));}}, {game,token});
 await page.route('**/dist/app.js?*',r=>r.fulfill({contentType:'text/javascript',body:output.outputFiles[0].text}));
 await page.route('**/api/status',r=>r.fulfill({json:{configured:true,cloudSave:true,release:'development',protocol:'living-cat-world-v4'}}));
 await page.route('**/api/jobcity/plan',r=>r.fulfill({status:503,json:{error:'Private QA: no paid inference'}}));
 await page.route('**/api/crypto/forecast',async r=>{const req=JSON.parse(r.request().postData());calls.set(req.attemptId,(calls.get(req.attemptId)||0)+1);const snapshot=await(await fetch(local.base+'/api/save',{headers})).json();assert.equal(snapshot.game.jobCity.profiles[req.catId].investments.current.id,req.attemptId,'Reservation must reach durable storage before forecast');await r.fulfill({json:{attemptId:req.attemptId,source:'ai',forecast:{asset:'BTC',direction:'up',strength:.08,confidence:1,reason:'Тестовий ігровий прогноз, результат не гарантовано.'}}});});
 await page.goto(local.base);assert.equal(await page.locator('script[src*="dist/app.js"]').count(),1,'Private app entry must load from loopback directly');console.log('Private app loaded; waiting for editable world.');await page.waitForFunction(()=>window.__cryptoQA&&window.__cryptoSave?.cloud.editable,{},{timeout:60000});
 await page.evaluate(()=>__cryptoSave.world.focus('jobcity'));await page.waitForFunction(()=>__cryptoQA.itemGroups.get('job-crypto')?.userData.stats?.floors===3);
 await page.evaluate(()=>__cryptoQA.step(180));const employees=await page.evaluate(ids=>ids.map(id=>({id,phase:__cryptoQA.jobs.get(id)?.phase,slot:__cryptoQA.jobs.get(id)?.slot})),ids);assert.ok(employees.every(p=>p.phase==='work'),JSON.stringify(employees));assert.equal(new Set(employees.map(p=>p.slot)).size,6);console.log('Six approved cats reached six native crypto workplaces.');
 assert.equal(await page.evaluate(()=>__cryptoSave.world.inspectJobBusiness('job-crypto')),true);console.log('Crypto interior inspection opened.');await page.waitForFunction(()=>__cryptoQA.itemGroups.get('job-crypto').userData.roof.visible===false);await page.waitForTimeout(400);await page.screenshot({path:path.join(review,'interior-desktop.png')});
 console.log('Starting reserved weekly trade.');await page.evaluate(id=>__cryptoSave.start(id),trader);await page.waitForFunction(id=>__cryptoSave.getGame().jobCity.profiles[id].investments.current?.status==='open',trader);const opened=await page.evaluate(id=>structuredClone(__cryptoSave.getGame().jobCity.profiles[id]),trader);assert.equal(opened.investments.nextAttemptDay,14);assert.equal(opened.coins,5000-opened.investments.current.margin);assert.equal(calls.size,1);if(rallyAudit)assert.equal(opened.investments.current.marketEvent.kind,'moonshot');
 await page.evaluate(()=>__cryptoSave.open());
 const choices=await page.locator('#jobcity-cat option').evaluateAll(ns=>ns.map(n=>({id:n.value,text:n.textContent,aria:n.getAttribute('aria-label')})));
 assert.deepEqual(choices.filter(n=>n.text.includes('📈')).map(n=>n.id),[trader]);
 assert.match(choices.find(n=>n.id===trader).aria,/Відкрита криптоугода/);
 await page.selectOption('#jobcity-cat',ids.find(id=>id!==trader));
 assert.equal(await page.locator('#jobcity-cat option').evaluateAll(ns=>ns.filter(n=>n.textContent.includes('📈')).length),1);
 await page.selectOption('#jobcity-cat',trader);await page.getByRole('button',{name:'Інвестиції',exact:true}).click();await page.locator('#cat-life-investments').evaluate(el=>el.scrollIntoView({block:'start'}));assert.match(await page.locator('#cat-life-investments').innerText(),/BTC/);await page.screenshot({path:path.join(review,'investments-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#cat-life-investments').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(review,'investments-phone.png')});const layout=await page.locator('#jobcity-dialog').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(layout.scroll<=layout.width+1);
 for(let i=0;i<55;i++){const status=await page.evaluate(id=>__cryptoSave.getGame().jobCity.profiles[id].investments.current.status,trader);if(status!=='open')break;await page.waitForTimeout(1000);}
 const settled=await page.evaluate(id=>structuredClone(__cryptoSave.getGame().jobCity.profiles[id]),trader),trade=settled.investments.current;assert.ok(['closed','liquidated'].includes(trade.status));assert.equal(settled.coins,5000+trade.pnl);assert.equal(settled.investments.history.length,1);console.log('Real 45-second local price simulation settled once; weekly schedule and escrow balance agree.');
 await page.waitForFunction(id=>!Array.from(document.querySelector('#jobcity-cat').options).find(o=>o.value===id)?.textContent.includes('📈'),trader);
 if(rallyAudit){
  assert.equal(trade.status,'closed');assert.ok(settled.coins>=7500);assert.equal(trade.marketEvent.kind,'moonshot');
  assert.match(await page.locator('#cat-life-investments').innerText(),/Рідкісний зліт/);
  await page.screenshot({path:path.join(review,'rare-rally-phone.png')});
 }
 await page.getByRole('button',{name:'Закрити Cat Job City'}).click();await page.evaluate(()=>__cryptoSave.world.exitCourt());assert.equal(await page.evaluate(()=>__cryptoQA.itemGroups.get('job-crypto').userData.roof.visible),true);await page.evaluate(()=>__cryptoSave.cloud.flush());
 for(let i=0;i<3;i++){await page.evaluate(()=>__cryptoSave.cloud.releaseEditor());navigating=true;await page.reload();await page.waitForFunction(()=>window.__cryptoQA&&window.__cryptoSave?.cloud.editable);navigating=false;const p=await page.evaluate(id=>__cryptoSave.getGame().jobCity.profiles[id],trader);assert.equal(p.coins,settled.coins);assert.deepEqual(p.investments,settled.investments);}
 assert.equal(calls.size,1);assert.ok([...calls.values()].every(n=>n===1));assert.deepEqual(errors,[]);await fs.writeFile(path.join(review,'result.json'),JSON.stringify({employees,layout,forecastCalls:[...calls.values()],intervalDays:CRYPTO_RULES.intervalDays,activeTradeBadge:{onlyOpenTrader:true,retainedAcrossSelection:true,removedAfterSettlement:true},settlement:{status:trade.status,pnl:trade.pnl,coins:settled.coins,marketEvent:trade.marketEvent},reloads:3,errors,navigationErrors},null,2));console.log('Three real app reloads retain results and wallet with one mocked forecast; zero paid requests or active-document exceptions. Navigation cancellations:',navigationErrors.length);
}catch(error){
 if(qaPage){
  try{const boot=await qaPage.evaluate(()=>({qa:!!window.__cryptoQA,save:!!window.__cryptoSave,editable:window.__cryptoSave?.cloud.editable,conflict:window.__cryptoSave?.cloud.conflict,text:document.body.innerText.slice(0,2500)}));await fs.writeFile(path.join(review,'failed-bootstrap.json'),JSON.stringify(boot,null,2));}catch{}
 }
 throw error;
}finally{await browser?.close();local.stop();}
