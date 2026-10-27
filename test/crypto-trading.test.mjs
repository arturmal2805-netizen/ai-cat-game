import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
import {reserveCryptoAttempt,applyCryptoForecast,advanceCryptoTrading,positionValue,normalizeInvestments,CRYPTO_RULES,cryptoMarketEvent} from '../public/crypto-trading.js';
import {CryptoAIRequestLedger} from '../crypto-ai.mjs';
import {mergeSharedWorld} from '../shared-world.mjs';
import {BIOMES,NEIGHBORS} from '../public/game-data.js';
import {ADOPTION_CATS} from '../public/cat-breeds.js';
const epoch=Date.UTC(2026,9,21,12),now=epoch+7*1440000;
function seed(){let g=newGame(epoch);g.unlocked.push('jobcity');g=ensureJobCity(g,epoch);for(const p of Object.values(g.jobCity.profiles)){p.profession='crypto';p.professionSinceDay=0;p.professionSource='ai';p.careerAIPending=false;p.coins=5000;}return g;}
function pending(){let g=seed();for(let i=0;i<40;i++){const r=reserveCryptoAttempt(g,now);g=r.game;if(r.request)return {g,request:r.request};}throw Error('No willing trader in test roster');}
const forecast={asset:'BTC',direction:'up',strength:.06,confidence:1,reason:'Ігровий ринок може зростати, але ризик залишається.'};
function moonshot(direction='up'){
 const {g,request}=pending();
 for(let i=0;i<10000;i++){
  const id='rare-rally-'+i;if(!cryptoMarketEvent(id))continue;
  const next=structuredClone(g),r={...request,attemptId:id};next.jobCity.profiles[r.catId].investments.current.id=id;
  const opened=applyCryptoForecast(next,r,{...forecast,direction},'local',now);
  if(direction==='down'||!opened.jobCity.profiles[r.catId].investments.current.liquidation)return {base:next,opened,request:r};
 }
 throw Error('No rare rally fixture');
}
test('rare rallies are deterministic five-percent events, with independent strengths between eight and twenty-five times',()=>{
 let rallies=0;const strengths=new Set();
 for(let i=0;i<20000;i++){
  const id='crypto-weekly-event-'+i,e=cryptoMarketEvent(id);assert.deepEqual(cryptoMarketEvent(id),e);
  if(!e)continue;rallies++;strengths.add(e.multiplier);
  assert.equal(e.kind,'moonshot');assert.ok(e.multiplier>=8&&e.multiplier<=25);assert.ok(e.startsAt>=.2&&e.startsAt<=.4);
 }
 assert.ok(rallies>900&&rallies<1100,`${rallies}/20000 rallies`);
 assert.equal(strengths.size,18);
});
test('a rare winning rally visibly rises, makes the trader much richer and settles exactly once across restart and concurrent saves',()=>{
 const {base,opened,request}=moonshot(),p=opened.jobCity.profiles[request.catId],t=p.investments.current,old=base.jobCity.profiles[p.id].coins;
 const repeated=applyCryptoForecast(base,request,forecast,'local',now);
 assert.deepEqual(repeated.jobCity.profiles[p.id].investments.current,t,'the attempt cannot reroll its saved event or path');
 assert.equal(t.path.length,65);assert.equal(t.path[0],t.entryPrice);
 assert.ok(Math.abs(t.path.at(-1)/t.entryPrice-t.marketEvent.multiplier)<1e-10);
 assert.ok(t.path[45]>t.path[30]&&t.path[60]>t.path[45],'rally is animated across the path');
 assert.equal(p.coins,old-t.margin,'no credit until settlement');
 const current=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(opened):null},now+10000,{advance:false});
 assert.deepEqual(current.jobCity.profiles[p.id].investments.current,t);
 const closed=advanceCryptoTrading(current,t.endAt+1),rich=closed.jobCity.profiles[p.id];
 assert.ok(rich.coins>=old*1.5,`${old} -> ${rich.coins}`);
 assert.equal(rich.coins,old+rich.investments.current.pnl);assert.equal(rich.earnedTotal,base.jobCity.profiles[p.id].earnedTotal+rich.investments.current.pnl);
 assert.equal(closed.coins,base.coins,'the player wallet is independent');
 const merged=mergeSharedWorld(opened,closed,advanceCryptoTrading(structuredClone(opened),t.endAt+1));
 assert.deepEqual(merged.jobCity.profiles[p.id],rich,'simultaneous settlement merges cannot double pay');
 for(let i=0;i<10;i++){
  const reloaded=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(merged):null},t.endAt+1,{advance:false});
  assert.equal(advanceCryptoTrading(reloaded,t.endAt+99999),reloaded);assert.deepEqual(reloaded.jobCity.profiles[p.id],rich);
 }
 const broken=structuredClone(opened);broken.jobCity.profiles[p.id].investments.current.marketEvent.multiplier=Infinity;
 const recovered=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(broken):k===SAVE_KEY+':backup'?JSON.stringify(opened):null},now,{advance:false});
 assert.deepEqual(recovered.jobCity.profiles[p.id],p,'invalid event metadata uses the verified escrow backup');
});
test('shorting a soaring coin still liquidates at its first crossing and loses only the escrowed margin',()=>{
 const {base,opened,request}=moonshot('down'),p=opened.jobCity.profiles[request.catId],t=p.investments.current;
 assert.equal(t.liquidation,true);assert.ok(t.endAt<now+t.durationMs);
 const closed=advanceCryptoTrading(opened,t.endAt+1),n=closed.jobCity.profiles[p.id];
 assert.equal(n.investments.current.status,'liquidated');assert.equal(n.coins,base.jobCity.profiles[p.id].coins-t.margin);
 assert.equal(n.investments.current.pnl,-t.margin);assert.equal(advanceCryptoTrading(closed,t.endAt+1000),closed);
});
test('opening the new version never changes an already persisted legacy price path',()=>{
 const {g,request}=pending(),opened=applyCryptoForecast(g,request,forecast,'ai',now),t=opened.jobCity.profiles[request.catId].investments.current;
 delete t.marketEvent;const path=t.path.slice();
 const loaded=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(opened):null},now,{advance:false});
 assert.deepEqual(loaded.jobCity.profiles[request.catId].investments.current.path,path);
 assert.equal(loaded.jobCity.profiles[request.catId].investments.current.marketEvent,undefined);
});
test('only employed crypto cats may reserve, individual skipped/poor cycles are remembered and never ask again before the next seven-day cycle',()=>{
 let g=seed();for(const p of Object.values(g.jobCity.profiles))p.profession='bank';assert.equal(reserveCryptoAttempt(g,now).game,g);
 const ids=Object.keys(g.jobCity.profiles).slice(0,2);for(const id of ids){g.jobCity.profiles[id].profession='crypto';g.jobCity.profiles[id].coins=0;}
 for(let i=0;i<2;i++){const r=reserveCryptoAttempt(g,now);g=r.game;assert.equal(r.request,null);}
 for(const id of ids){const p=g.jobCity.profiles[id];assert.equal(p.investments.current.status,'skipped');assert.equal(p.investments.nextAttemptDay,14);p.coins=10000;}
 for(let i=0;i<30;i++)assert.equal(reserveCryptoAttempt(g,now+i*1000).game,g);
 assert.notEqual(reserveCryptoAttempt(g,epoch+14*1440000).game,g);
});
test('LONG and SHORT use directional leveraged PNL with escrow and fees, and settlement never credits twice',()=>{
 for(const [direction,delta,expected] of [['up',.1,29],['down',-.1,29],['up',-.1,-31],['down',.1,-31]]){
  const {g,request}=pending(),before=g.jobCity.profiles[request.catId].coins;
  const opened=applyCryptoForecast(g,request,{...forecast,direction},'ai',now),p=opened.jobCity.profiles[request.catId],t=p.investments.current;
  assert.equal(p.coins,before-t.margin);assert.equal(applyCryptoForecast(opened,request,forecast,'ai',now),opened);
  // A controlled persisted price path isolates accounting from forecast luck.
  const originalMargin=t.margin;t.margin=100;t.leverage=3;t.fee=1;t.path=Array.from({length:65},(_,i)=>t.entryPrice*(1+delta*i/64));t.liquidation=false;t.endAt=now+t.durationMs;
  p.coins=before-100;
  assert.equal(positionValue(t,t.endAt).pnl,expected);
  const closed=advanceCryptoTrading(opened,t.endAt+1),n=closed.jobCity.profiles[request.catId];
  assert.equal(n.coins,before+expected);assert.equal(n.investments.totalPNL,expected);assert.equal(n.investments.history.length,1);
  assert.equal(advanceCryptoTrading(closed,t.endAt+9999999),closed);assert.ok(originalMargin>0);
 }
});
test('saved prices, timers, escrow and terminal results survive thirty reloads without another payment',()=>{
 const {g,request}=pending();let current=applyCryptoForecast(g,request,forecast,'ai',now),expected=structuredClone(current.jobCity.profiles[request.catId].investments),coins=current.jobCity.profiles[request.catId].coins;
 for(let i=0;i<30;i++){
  current=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(current):null},now+10000,{advance:false});
  assert.deepEqual(current.jobCity.profiles[request.catId].investments,expected);assert.equal(current.jobCity.profiles[request.catId].coins,coins);
 }
 current=advanceCryptoTrading(current,now+60001);assert.ok(normalizeInvestments(current.jobCity.profiles[request.catId].investments));
 const persisted=structuredClone(current.jobCity.profiles[request.catId]);
 for(let i=0;i<10;i++)current=advanceCryptoTrading(current,now+86400000);
 assert.deepEqual(current.jobCity.profiles[request.catId],persisted);
});
test('liquidation closes at the first persisted price crossing, consumes at most margin and cannot make a wallet negative',()=>{
 const {g,request}=pending();let opened,t;
 for(let i=0;i<1000;i++){
  const sample=structuredClone(g),r={...request,attemptId:'liquidation-'+i};sample.jobCity.profiles[r.catId].personality='Винахідливий';sample.jobCity.profiles[r.catId].investments.current.id=r.attemptId;
  opened=applyCryptoForecast(sample,r,forecast,'local',now);t=opened.jobCity.profiles[r.catId].investments.current;
  if(t.liquidation)break;
 }
 assert.equal(t.liquidation,true);assert.ok(t.endAt<now+t.durationMs);
 const principal=opened.jobCity.profiles[request.catId].coins,closed=advanceCryptoTrading(opened,t.endAt+1),p=closed.jobCity.profiles[request.catId];
 assert.equal(p.coins,principal);assert.ok(p.coins>=0);assert.equal(p.investments.current.status,'liquidated');assert.equal(p.investments.current.pnl,-t.margin);
});
function memory(game){const map=new Map([['current',{game}]]);let queue=Promise.resolve();const t={get:async k=>structuredClone(map.get(k)),put:async(k,v)=>map.set(k,structuredClone(v))};return {...t,transaction(fn){const p=queue.then(()=>fn(t));queue=p.catch(()=>{});return p;}};}
test('concurrent devices, lost ACKs, a restarted ledger and provider failure consume at most one forecast per reserved cycle',async()=>{
 const {g,request}=pending(),storage=memory(g);let calls=0;
 const ledger=new CryptoAIRequestLedger(storage,async()=>{calls++;await new Promise(r=>setTimeout(r,2));return {response:forecast};},{clock:()=>now});
 const results=await Promise.all(Array.from({length:30},()=>ledger.forecast(request)));assert.equal(calls,1);for(const r of results)assert.deepEqual(r,results[0]);
 const restart=new CryptoAIRequestLedger(storage,async()=>{calls++;throw Error();},{clock:()=>now});assert.deepEqual(await restart.forecast(request),results[0]);assert.equal(calls,1);
 const broken=memory(g),failure=new CryptoAIRequestLedger(broken,async()=>{calls++;throw Error('quota');},{clock:()=>now});
 const fallback=await failure.forecast(request);assert.equal(fallback.body.source,'local');assert.equal(fallback.status,200);await failure.forecast(request);assert.equal(calls,2);
 const uncertain=memory(g);await uncertain.put('crypto-ai:'+request.catId,{attemptId:request.attemptId,day:7,epoch});
 await new CryptoAIRequestLedger(uncertain,async()=>{calls++;},{clock:()=>now}).forecast(request);assert.equal(calls,2);
});
test('unreserved/other-profession forecasts cannot spend credits and cached clients cannot erase investments or double-spend escrow',async()=>{
 const {g,request}=pending(),invalid=structuredClone(g);invalid.jobCity.profiles[request.catId].profession='bank';let calls=0;
 const ledger=new CryptoAIRequestLedger(memory(invalid),async()=>{calls++;},{clock:()=>now});assert.equal((await ledger.forecast(request)).status,409);assert.equal(calls,0);
 const opened=applyCryptoForecast(g,request,forecast,'ai',now),cached=structuredClone(g);
 delete cached.jobCity.profiles[request.catId].investments;
 assert.deepEqual(mergeSharedWorld(g,opened,cached).jobCity.profiles[request.catId].investments,opened.jobCity.profiles[request.catId].investments);
 cached.jobCity.profiles[request.catId].coins-=50;
 assert.throws(()=>mergeSharedWorld(g,opened,cached));
});
test('seven-day periods follow each career start and never replay offline weeks or change family pacing',()=>{
 let g=seed();for(const p of Object.values(g.jobCity.profiles)){p.profession='bank';p.coins=0;}
 const p=g.jobCity.profiles.chichi;p.profession='crypto';p.professionSinceDay=9;
 assert.equal(CRYPTO_RULES.intervalDays,7);assert.equal(reserveCryptoAttempt(g,epoch+15*1440000).game,g);
 g=reserveCryptoAttempt(g,epoch+16*1440000).game;assert.equal(g.jobCity.profiles.chichi.investments.lastAttemptDay,16);assert.equal(g.jobCity.profiles.chichi.investments.nextAttemptDay,23);
 assert.equal(reserveCryptoAttempt(g,epoch+22*1440000).game,g);
 const family=structuredClone(g.family);g=reserveCryptoAttempt(g,epoch+80*1440000).game;
 assert.equal(g.jobCity.profiles.chichi.investments.history.length,2);assert.equal(g.jobCity.profiles.chichi.investments.nextAttemptDay,87);assert.deepEqual(g.family,family);
});
test('the server rejects an early second cycle and admits the same trader exactly seven days later',async()=>{
 const {g,request}=pending(),storage=memory(g);let clock=now,calls=0;
 const ledger=new CryptoAIRequestLedger(storage,async()=>{calls++;return {response:forecast};},{clock:()=>clock});
 assert.equal((await ledger.forecast(request)).status,200);assert.equal(calls,1);
 async function next(day){const saved=structuredClone(g),s=saved.jobCity.profiles[request.catId].investments,id=request.attemptId+'-day-'+day;s.current={...s.current,id,day,at:epoch+day*1440000};s.lastAttemptDay=day;s.nextAttemptDay=day+7;clock=epoch+day*1440000;await storage.put('current',{game:saved});return ledger.forecast({...request,attemptId:id});}
 assert.equal((await next(13)).status,409);assert.equal(calls,1);assert.equal((await next(14)).status,200);assert.equal(calls,2);
});
test('large private trading wallets survive reload without a ten-million-coin truncation; corrupt escrow uses the save backup',()=>{
 const {g,request}=pending();g.jobCity.profiles[request.catId].coins=12345678;
 let opened=applyCryptoForecast(g,request,forecast,'ai',now);const expected=structuredClone(opened.jobCity.profiles[request.catId]);
 for(let i=0;i<30;i++){opened=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(opened):null},now,{advance:false});assert.deepEqual(opened.jobCity.profiles[request.catId],expected);}
 const corrupt=structuredClone(opened);corrupt.jobCity.profiles[request.catId].investments.current.path[5]=null;
 const recovered=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(corrupt):k===SAVE_KEY+':backup'?JSON.stringify(opened):null},now,{advance:false});
 assert.deepEqual(recovered.jobCity.profiles[request.catId],expected);
});

test('every existing, new, tiny and magical cat can trade when officially employed in crypto, with independent weekly receipts',async t=>{
 let catalogue=newGame(epoch);
 catalogue.unlocked=BIOMES.map(b=>b.id);
 catalogue.adoption.cats=ADOPTION_CATS.map(c=>({id:c.id,adoptedAt:epoch,homeBiome:'moon',centerId:''}));
 catalogue.catDestinations=Object.fromEntries(NEIGHBORS.map(c=>[c.id,'moon']));
 catalogue=ensureJobCity(catalogue,epoch);
 for(const p of Object.values(catalogue.jobCity.profiles)){
  p.profession='bank';p.professionSinceDay=0;p.professionSource='ai';p.careerAIPending=false;p.coins=5000;
 }
 const ids=Object.keys(catalogue.jobCity.profiles);
 assert.ok(ids.includes('adopt-magic-dragon')&&ids.includes('adopt-magic-dragon-tiny'));
 for(const c of ADOPTION_CATS)assert.ok(ids.includes(c.id),c.id+': missing new cat profile');
 let forecasts=0,skips=0;
 for(const id of ids){
  let game=structuredClone(catalogue),request,at;
  game.jobCity.profiles[id].profession='crypto';
  const original=game.jobCity.profiles[id].coins,playerCoins=game.coins;
  // A cat is allowed to skip a cycle. It must still become eligible again;
  // test its actual willingness decision rather than replacing it with true.
  for(let cycle=1;cycle<=32;cycle++){
   at=epoch+cycle*7*1440000;
   const reserved=reserveCryptoAttempt(game,at);game=reserved.game;
   const p=game.jobCity.profiles[id];
   assert.equal(p.investments.lastAttemptDay,cycle*7,id);
   assert.equal(p.investments.nextAttemptDay,cycle*7+7,id);
   assert.equal(reserveCryptoAttempt(game,at+1000).game,game,id+': duplicate same-cycle reservation');
   if(reserved.request){request=reserved.request;break;}
   skips++;assert.equal(p.coins,original,id+': skipping cannot charge');
  }
  assert.ok(request,id+': no eligible trade after 32 independent weekly choices');
  assert.equal(request.catId,id);
  const storage=memory(game),ledger=new CryptoAIRequestLedger(storage,async()=>{forecasts++;return {response:{...forecast,confidence:1}};},{clock:()=>at});
  const answer=await ledger.forecast(request);assert.equal(answer.status,200,id+': server admission');
  const opened=applyCryptoForecast(game,request,{...forecast,confidence:1},'ai',at),trade=opened.jobCity.profiles[id].investments.current;
  assert.equal(trade.status,'open',id);
  assert.equal(opened.jobCity.profiles[id].coins,original-trade.margin,id);
  assert.equal(applyCryptoForecast(opened,request,forecast,'ai',at),opened,id+': no duplicate escrow');
  const closed=advanceCryptoTrading(opened,trade.endAt+1),p=closed.jobCity.profiles[id];
  assert.ok(['closed','liquidated'].includes(p.investments.current.status),id);
  assert.equal(p.coins,original+p.investments.current.pnl,id);
  assert.equal(closed.coins,playerCoins,id+': private trading must not charge the player');
  for(let i=0;i<3;i++){
   const reloaded=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(closed):null},trade.endAt+1,{advance:false});
   assert.deepEqual(reloaded.jobCity.profiles[id].investments,p.investments,id);
   assert.equal(reloaded.jobCity.profiles[id].coins,p.coins,id);
  }
  assert.equal(advanceCryptoTrading(closed,trade.endAt+999999),closed,id+': no duplicate payout');
 }
 assert.equal(forecasts,ids.length);
 t.diagnostic(`${ids.length} cat profiles, ${ADOPTION_CATS.length} adoption cats, ${forecasts} mocked forecasts and ${skips} voluntary skipped cycles; zero paid requests.`);
});
