import test from 'node:test';import assert from 'node:assert/strict';
import{newGame,loadGame,SAVE_KEY}from'../public/economy.js';import{ensureJobCity,applyJobPlan,localJobPlan,cityClock,recordJobAttendance,advanceJobCity}from'../public/jobcity-system.js';import{JOB_START,JOB_END,JOB_CLOCK_ORIGIN,JOB_SHIFT_MINUTES,jobBusiness}from'../public/jobcity-data.js';import{nextCityAIEvent,reserveCityAIEvent}from'../public/city-ai-schedule.js';import{validateCityAIState}from'../jobcity-ai.mjs';import{homeRestTime}from'../public/housing-runtime.js';import{buyCatHome}from'../public/housing-system.js';import{cryptoClock,reserveCryptoAttempt}from'../public/crypto-trading.js';
const epoch=Date.UTC(2026,9,21,12),at=(day,minute)=>epoch+(day*1440+minute-JOB_CLOCK_ORIGIN)*1000;
function seed(day=1){let g=newGame(epoch);g.unlocked.push('jobcity');g=ensureJobCity(g,epoch);for(const p of Object.values(g.jobCity.profiles)){p.careerAIPending=false;p.professionSource='ai';}return applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),day),day,'local');}
test('09:00–17:00 boundaries and eight-hour attendance preserve the released calendar origin, wages and one settlement',()=>{
 let g=seed(),id=Object.keys(g.jobCity.profiles).find(id=>g.jobCity.profiles[id].schedule.job!=='rest'),p=g.jobCity.profiles[id],business=jobBusiness(p.schedule.job);
 assert.equal(JOB_START,540);assert.equal(JOB_END,1020);assert.equal(JOB_SHIFT_MINUTES,480);assert.equal(cityClock(g.jobCity,epoch).label,'12:00');assert.equal(g.jobCity.epoch,epoch);
 for(const [minute,working]of [[539,false],[540,true],[1019,true],[1020,false]])assert.equal(cityClock(g.jobCity,at(1,minute)).working,working);
 g=recordJobAttendance(g,id,business.kind,true,at(1,540));assert.equal(advanceJobCity(g,at(1,1020)-1),g);g=advanceJobCity(g,at(1,1020));
 assert.equal(g.jobCity.profiles[id].coins,business.wage*8);assert.equal(g.jobCity.profiles[id].shifts[0].minutes,480);
 const saved=structuredClone(g);for(let i=0;i<20;i++){g=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(g):null},at(1,1100),{advance:false});g=advanceJobCity(g,at(1,1100));assert.deepEqual(g.jobCity,saved.jobCity);assert.deepEqual(g.family,saved.family);}
});
test('the single saved after-work batch starts at 17:00, passes the server validator and is not repeated at the old 19:00 boundary',()=>{
 let g=seed();assert.equal(nextCityAIEvent(g,at(1,1019)),null);const event=nextCityAIEvent(g,at(1,1020));assert.equal(event.phase,'evening');assert.equal(validateCityAIState(event).minute,1020);g=reserveCityAIEvent(g,event);
 assert.equal(nextCityAIEvent(g,at(1,1021)),null);assert.equal(nextCityAIEvent(g,at(1,1140)),null);
});
test('quiet homeowners may rest at 17:00 while walkers retain their selected free time, and crypto uses the same unshifted clock',()=>{
 let g=seed(7);g.jobCity.profiles.chichi.coins=10000;g=buyCatHome(g,'chichi','home-sage','buy-chichi-1',{},epoch);const p=g.jobCity.profiles.chichi;p.schedule={day:7,job:p.profession,evening:'rest'};
 assert.equal(homeRestTime(g,'chichi',at(7,1019)),false);assert.equal(homeRestTime(g,'chichi',at(7,1020)),true);p.schedule.evening='walk';assert.equal(homeRestTime(g,'chichi',at(7,1020)),false);
 for(const minute of [539,540,1019,1020]){const a=cityClock(g.jobCity,at(7,minute)),b=cryptoClock(g.jobCity,at(7,minute));assert.equal(a.minute,b.minute);assert.equal(a.day,b.day);}
 for(const p of Object.values(g.jobCity.profiles))p.profession='bank';p.profession='crypto';p.professionSinceDay=0;p.coins=0;
 assert.equal(reserveCryptoAttempt(g,at(7,539)).game,g);assert.notEqual(reserveCryptoAttempt(g,at(7,540)).game,g);assert.equal(reserveCryptoAttempt(g,at(7,1020)).game,g);
});
