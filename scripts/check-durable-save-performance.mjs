// Private fixed-world save benchmark: real localStorage, no rendering or AI.
// Alternating A/B/B/A avoids confusing GPU/shader work with durable-write cost.
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGame} from '../public/economy.js';
import {BIOMES} from '../public/game-data.js';
import {ADOPTION_CATS} from '../public/cat-breeds.js';
import {ensureJobCity} from '../public/jobcity-system.js';
import {buyCatHome} from '../public/housing-system.js';
import {HOUSE_TYPES} from '../public/housing-data.js';
const require=createRequire(import.meta.url), playwright=require(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.CHICHI_BROWSER==='webkit'?'webkit':'chromium';
const root=path.resolve(import.meta.dirname,'..'), baseline=process.env.CHICHI_BASELINE_REF||'4e4f7e4';
assert.match(baseline,/^[a-f0-9]{7,40}$/);
const bundles=[];
for(const old of [true,false]) {
  const result=await build({stdin:{contents:"export {saveGame,SAVE_KEY} from './public/economy.js';export {CloudBackup} from './public/cloud-save.js';",resolveDir:root,loader:'js'},bundle:true,write:false,format:'esm',platform:'browser',plugins:old?[{name:'baseline',setup(b){b.onLoad({filter:/\/public\/.*\.js$/},args=>({contents:execFileSync('git',['show',baseline+':public/'+path.basename(args.path)],{cwd:root,encoding:'utf8'}),loader:'js'}));}}]:[]});
  bundles.push('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const now=1700000000000;let game=newGame(now);game.unlocked=BIOMES.map(b=>b.id);
game.adoption.cats=ADOPTION_CATS.slice(0,16).map(c=>({id:c.id,adoptedAt:now,homeBiome:'moon',centerId:''}));
game=ensureJobCity(game,now);const ids=Object.keys(game.jobCity.profiles);
for(const p of Object.values(game.jobCity.profiles))p.coins=1000000;
for(let i=0;i<75;i++){const id=ids[i%ids.length];game=buyCatHome(game,id,HOUSE_TYPES[i%7].id,'buy-'+id+'-'+(game.jobCity.profiles[id].purchaseCount+1),{},now);}
const browser=await playwright[engine].launch(engine==='webkit'?{}:{executablePath:process.env.CHICHI_CHROMIUM||undefined,args:['--no-sandbox']});
try {
 const page=await browser.newPage();await page.route('https://chichi-private.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Private durable save benchmark</title>'}));await page.goto('https://chichi-private.invalid/');
 const results=[];
 for(const variant of [0,1,1,0]) {
  const result=await page.evaluate(async({bundle,seed})=>{
   const {saveGame,SAVE_KEY,CloudBackup}=await import(bundle);localStorage.clear();
   const client=new CloudBackup({storage:localStorage,base:location.origin,cooperative:true,delay:60000,sessionStorage:undefined,fetcher:async()=>{throw Error('No network in this benchmark');}});
   client.localGame=structuredClone(seed);saveGame(localStorage,seed);saveGame(localStorage,{...seed,coins:seed.coins-1});saveGame(localStorage,seed);client.enqueue(seed);clearTimeout(client.timer);
   const copy=globalThis.structuredClone, put=Storage.prototype.setItem, frames=[];let clones=0,writes=0;
   globalThis.structuredClone=(...a)=>{clones++;return copy(...a);};Storage.prototype.setItem=function(...a){writes++;return put.apply(this,a);};
   let next;
   try {for(let i=0;i<48;i++){
    next=copy(seed);next.coins+=i+1;
    const start=performance.now();if(!saveGame(localStorage,next))throw Error('Durability check failed');client.enqueue(next);clearTimeout(client.timer);frames.push(performance.now()-start);
   }}finally{globalThis.structuredClone=copy;Storage.prototype.setItem=put;}
   const raw=localStorage.getItem(SAVE_KEY),box=JSON.parse(localStorage.getItem('chichi-cloud-outbox'));
   if(raw!==JSON.stringify(next)||JSON.stringify(box.pending.game)!==raw||JSON.stringify(box.pending.baseGame)!==JSON.stringify(seed))throw Error('Save/base bytes changed');
   const restart=new CloudBackup({storage:localStorage,base:location.origin,cooperative:true,sessionStorage:undefined});
   if(JSON.stringify(restart.pending)!==JSON.stringify(box.pending))throw Error('Restart lost pending purchase');
   frames.sort((a,b)=>a-b);
   return {samples:frames.length,medianMs:frames[24],p95Ms:frames[45],maxMs:frames.at(-1),clones,writes,primaryBytes:raw.length,outboxBytes:localStorage.getItem('chichi-cloud-outbox').length,homes:Object.keys(next.housing.homes).length,exactJournal:true,restart:true};
  },{bundle:bundles[variant],seed:game});
  assert.equal(result.homes,75);assert.equal(result.writes,288);assert.equal(result.clones,variant?48:96);
  results.push({variant:variant?'optimized':'baseline',...result});
 }
 const output={baseline,engine,privateWorld:true,aiCalls:0,rendering:false,order:'A/B/B/A',results};
 if(process.env.CHICHI_REVIEW_DIR){fs.mkdirSync(process.env.CHICHI_REVIEW_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.CHICHI_REVIEW_DIR,'durable-save.json'),JSON.stringify(output,null,2));}
 console.log(JSON.stringify(output,null,2));
}finally{await browser.close();}
