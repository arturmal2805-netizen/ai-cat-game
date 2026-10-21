import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {ensureJobCity} from '../public/jobcity-system.js';
import {reserveCryptoAttempt,applyCryptoForecast,advanceCryptoTrading,positionValue,normalizeInvestments,CRYPTO_RULES} from '../public/crypto-trading.js';
import {CryptoAIRequestLedger} from '../crypto-ai.mjs';
import {mergeSharedWorld} from '../shared-world.mjs';
const epoch=Date.UTC(2026,9,21,12),now=epoch+14*1440000;
function seed(){let g=newGame(epoch);g.unlocked.push('jobcity');g=ensureJobCity(g,epoch);for(const p of Object.values(g.jobCity.profiles)){p.profession='crypto';p.professionSinceDay=0;p.professionSource='ai';p.careerAIPending=false;p.coins=5000;}return g;}
function pending(){let g=seed();for(let i=0;i<40;i++){const r=reserveCryptoAttempt(g,now);g=r.game;if(r.request)return {g,request:r.request};}throw Error('No willing trader in test roster');}
const forecast={asset:'BTC',direction:'up',strength:.06,confidence:1,reason:'Ігровий ринок може зростати, але ризик залишається.'};
test('only employed crypto cats may reserve, individual skipped/poor cycles are remembered and never ask again before day 14',()=>{
 let g=seed();for(const p of Object.values(g.jobCity.profiles))p.profession='bank';assert.equal(reserveCryptoAttempt(g,now).game,g);
 const ids=Object.keys(g.jobCity.profiles).slice(0,2);for(const id of ids){g.jobCity.profiles[id].profession='crypto';g.jobCity.profiles[id].coins=0;}
 for(let i=0;i<2;i++){const r=reserveCryptoAttempt(g,now);g=r.game;assert.equal(r.request,null);}
 for(const id of ids){const p=g.jobCity.profiles[id];assert.equal(p.investments.current.status,'skipped');assert.equal(p.investments.nextAttemptDay,28);p.coins=10000;}
 for(let i=0;i<30;i++)assert.equal(reserveCryptoAttempt(g,now+i*1000).game,g);
 assert.notEqual(reserveCryptoAttempt(g,epoch+28*1440000).game,g);
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
 const uncertain=memory(g);await uncertain.put('crypto-ai:'+request.catId,{attemptId:request.attemptId,day:14,epoch});
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
