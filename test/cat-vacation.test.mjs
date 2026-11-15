import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {ensureJobCity,localJobPlan,applyJobPlan,cityClock,recordJobAttendanceBatch} from '../public/jobcity-system.js';
import {planCatVacations,catOnVacation,normalizeCatVacation,vacationDaysLeft} from '../public/cat-vacation.js';
import {createJobCityRuntime} from '../public/jobcity-runtime.js';
import {homeRestTime,createHousingRuntime} from '../public/housing-runtime.js';
import {buyCatHome} from '../public/housing-system.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {JOB_CLOCK_ORIGIN} from '../public/jobcity-data.js';
const now=Date.UTC(2026,10,14),id='adopt-nimbus';
function seed(){
 let g=newGame(now);g.unlocked.push('jobcity','cat-homes');g.adoption.cats=[{id,adoptedAt:now,homeBiome:'moon',centerId:''}];
 g=ensureJobCity(g,now);g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),0),0);
 for(const p of Object.values(g.jobCity.profiles)){p.careerAIPending=false;p.lastPaidDay=0;p.coins=12000;}
 return g;
}
const at=(g,day,minute=12*60)=>g.jobCity.epoch+(day*1440+minute-JOB_CLOCK_ORIGIN)*1000;
const restore=(g,t)=>loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(g):null},t,{advance:false});

test('existing daily planner chooses only adopted established cats, saves a deterministic 2–7-day deadline and never rerolls it',()=>{
 const g=seed(),durations=new Set();let found=0;
 for(let day=1;day<400;day++){
  const next=planCatVacations(g,day);if(next===g)continue;found++;
  const v=next.jobCity.profiles[id].vacation;durations.add(v.endDay-v.startDay);assert.ok(v.endDay-day>=2&&v.endDay-day<=7);
  assert.equal(v.previousJob,g.jobCity.profiles[id].profession);assert.equal(next.jobCity.profiles[id].profession,g.jobCity.profiles[id].profession);
  assert.equal(planCatVacations(next,day),next);assert.deepEqual(planCatVacations(g,day),next);
  for(const p of Object.values(next.jobCity.profiles))if(p.id!==id)assert.deepEqual(p,g.jobCity.profiles[p.id]);
  assert.equal(next.coins,g.coins);assert.deepEqual(next.inventory,g.inventory);
 }
 assert.ok(found>5);assert.deepEqual([...durations].sort(),[2,3,4,5,6,7]);
});

test('vacation keeps the original job, blocks shifts/wages and lets the existing home routine run during the day',()=>{
 let g=seed(),p=g.jobCity.profiles[id];p.vacation={startDay:5,endDay:8,previousJob:p.profession};
 g=buyCatHome(g,id,'home-lavender','buy-adopt-nimbus-1',{},at(g,4));
 g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),6),6);
 p=g.jobCity.profiles[id];assert.equal(p.schedule.job,'rest');assert.ok(catOnVacation(p,cityClock(g.jobCity,at(g,6))));assert.equal(vacationDaysLeft(p,cityClock(g.jobCity,at(g,6))),2);
 const changed=recordJobAttendanceBatch(g,[{id,job:p.profession,active:true,now:at(g,6)}]);assert.equal(changed,g);
 const runtime=createJobCityRuntime(),actor={id,index:0,biome:'jobcity',local:{x:0,y:.16,z:59}};
 runtime.step(g,[actor],.1,0,{now:at(g,6)});assert.equal(runtime.has(id),false);
 assert.equal(homeRestTime(g,id,at(g,6,12*60)),true);assert.equal(homeRestTime(g,id,at(g,6,14*60)),false);
 const housing=createHousingRuntime();for(let i=0;i<600;i++)housing.step(g,[{id,radius:.55}],.1,i/10,{night:false,clock:cityClock(g.jobCity,at(g,6)),eligible:()=>true});assert.ok(housing.get(id),'vacationer reaches a native home rest even during working hours');housing.dispose?.();
});

test('reload and offline expiry preserve wallets/inventory and return the same profession to work',()=>{
 let g=seed();g.jobCity.profiles[id].vacation={startDay:5,endDay:8,previousJob:g.jobCity.profiles[id].profession};
 g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),6),6);
 const loaded=restore(g,at(g,7));assert.deepEqual(loaded.jobCity.profiles[id].vacation,g.jobCity.profiles[id].vacation);assert.equal(loaded.jobCity.profiles[id].coins,g.jobCity.profiles[id].coins);
 assert.equal(catOnVacation(loaded.jobCity.profiles[id],cityClock(loaded.jobCity,at(g,8,9*60)-1)),true);
 assert.equal(catOnVacation(loaded.jobCity.profiles[id],cityClock(loaded.jobCity,at(g,8,9*60))),false);
 const after=restore(g,at(g,10));const working=applyJobPlan(after,localJobPlan(Object.values(after.jobCity.profiles),10),10);assert.equal(working.jobCity.profiles[id].schedule.job,g.jobCity.profiles[id].profession);assert.equal(working.jobCity.profiles[id].profession,g.jobCity.profiles[id].profession);
 assert.equal(working.coins,after.coins);assert.deepEqual(working.inventory,after.inventory);assert.equal(working.jobCity.profiles[id].coins,after.jobCity.profiles[id].coins);
});

test('AI batches and cached clients cannot erase or extend a holiday; unrelated purchases remain mergeable',()=>{
 let g=seed();g.jobCity.profiles[id].vacation={startDay:5,endDay:8,previousJob:g.jobCity.profiles[id].profession};g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),6),6);
 const assignments=localJobPlan(Object.values(g.jobCity.profiles),6);assignments.find(a=>a.id===id).job=g.jobCity.profiles[id].profession;
 assert.equal(applyJobPlan(g,assignments,6,'ai',[],{phase:'careers'}).jobCity.profiles[id].schedule.job,'rest');
 const cached=structuredClone(g);delete cached.jobCity.profiles[id].vacation;cached.jobCity.profiles[id].coins-=10;assert.deepEqual(mergeSharedWorld(g,g,cached).jobCity.profiles[id].vacation,g.jobCity.profiles[id].vacation);
 const malformed=structuredClone(g);malformed.jobCity.profiles[id].vacation.endDay=20;assert.throws(()=>mergeSharedWorld(g,g,malformed));assert.throws(()=>normalizeCatVacation({startDay:0,endDay:8,previousJob:'bank'}));
});

test('two-day and seven-day holidays expire at the exact shared-clock boundary, including a middle reload',()=>{
 for(const duration of [2,7]){
  const g=seed(),p=g.jobCity.profiles[id];p.vacation={startDay:5,endDay:5+duration,previousJob:p.profession};
  const deadline=at(g,5+duration,9*60),middle=restore(g,at(g,6));
  assert.deepEqual(middle.jobCity.profiles[id].vacation,p.vacation);
  assert.equal(catOnVacation(p,cityClock(g.jobCity,deadline-1)),true);assert.equal(catOnVacation(p,cityClock(g.jobCity,deadline)),false);
  assert.equal(catOnVacation(p,cityClock(g.jobCity,at(g,20))),false);
 }
});

test('ordinary rest stays distinct; providedClock controls daytime housing, not the tab clock',()=>{
 let g=seed();g=buyCatHome(g,id,'home-lavender','buy-adopt-nimbus-1',{},now);const p=g.jobCity.profiles[id];p.schedule={day:6,job:'rest',evening:'rest'};
 const clock=cityClock(g.jobCity,at(g,6));assert.equal(catOnVacation(p,clock),false);assert.equal(homeRestTime(g,id,now,{clock}),false);
 const home=createHousingRuntime();home.step(g,[{id,radius:.55}],.1,0,{night:false,clock,eligible:()=>true});assert.equal(home.get(id),undefined);
 p.vacation={startDay:5,endDay:8,previousJob:p.profession};assert.equal(homeRestTime(g,id,now,{clock}),true);
 for(let i=0;i<600;i++)home.step(g,[{id,radius:.55}],.1,i/10,{night:false,clock,eligible:()=>true});assert.ok(home.get(id));
});

test('stale and parallel saves cannot extend, restart or resurrect an expired holiday',()=>{
 let g=seed();g.jobCity.profiles[id].vacation={startDay:5,endDay:8,previousJob:g.jobCity.profiles[id].profession};
 const extension=structuredClone(g);extension.jobCity.profiles[id].vacation.endDay=10;assert.throws(()=>mergeSharedWorld(g,g,extension),/продовжувати/);
 const current=structuredClone(g);current.jobCity.profiles[id].vacation={...g.jobCity.profiles[id].vacation,startDay:23,endDay:25};
 const stale=structuredClone(g);stale.jobCity.profiles[id].coins-=10;
 const merged=mergeSharedWorld(g,current,stale);assert.deepEqual(merged.jobCity.profiles[id].vacation,current.jobCity.profiles[id].vacation);assert.equal(catOnVacation(merged.jobCity.profiles[id],cityClock(merged.jobCity,at(g,30))),false);
 assert.deepEqual(mergeSharedWorld(g,current,stale).jobCity.profiles[id].vacation,merged.jobCity.profiles[id].vacation);
 const parallel=structuredClone(g);parallel.jobCity.profiles[id].vacation={...current.jobCity.profiles[id].vacation,endDay:30};assert.throws(()=>mergeSharedWorld(g,current,parallel));
});

test('rest fallback cannot overwrite a real profession, and returning respects the existing job capacity',()=>{
 const g=seed(),p=g.jobCity.profiles[id],profession=p.profession;p.preferences[0]=profession==='bank'?'factory':'bank';p.vacation={startDay:5,endDay:8,previousJob:profession};
 const resting=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),6),6);assert.equal(resting.jobCity.profiles[id].profession,profession);
 const employees=Array.from({length:6},(_,i)=>({...p,id:'jobcat-fixture-'+i,vacation:undefined,lastPaidDay:-1,preferences:[profession]}));
 const plan=localJobPlan([...employees,p],8);assert.equal(plan.filter(a=>a.job===profession).length,6);assert.equal(plan.find(a=>a.id===id).job,'rest');assert.equal(plan.find(a=>a.id===id).profession,profession);
 assert.equal(localJobPlan([...employees.slice(1),p],8).find(a=>a.id===id).job,profession);
});

test('a holiday removes the conflicting work route and expiry starts only one ordinary shift route',()=>{
 let g=seed();const p=g.jobCity.profiles[id],runtime=createJobCityRuntime(),actor={id,index:0,biome:'jobcity',local:{x:0,y:.16,z:59}};p.schedule={day:4,job:p.profession,evening:'rest'};
 runtime.step(g,[actor],.1,0,{now:at(g,4)});assert.ok(runtime.get(id)?.job);
 p.vacation={startDay:5,endDay:7,previousJob:p.profession};p.schedule={day:5,job:p.profession,evening:'rest'};runtime.step(g,[actor],.1,.1,{now:at(g,5)});assert.equal(runtime.has(id),false);
 g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),7),7);runtime.step(g,[actor],.1,.2,{now:at(g,7)});const shift=runtime.get(id);assert.equal(shift.job,p.profession);
 for(let i=0;i<10;i++)runtime.step(g,[actor],.1,i/10,{now:at(g,7)});assert.equal(runtime.states.size,1);assert.equal(runtime.get(id),shift);
});

test('the final-day plan survives a pre-shift reload and starts work exactly at 09:00 without another daily plan',()=>{
 let g=seed();const p=g.jobCity.profiles[id];p.vacation={startDay:5,endDay:8,previousJob:p.profession};
 g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),8),8);
 const before=restore(g,at(g,8,9*60-1));assert.equal(catOnVacation(before.jobCity.profiles[id],cityClock(before.jobCity,at(g,8,9*60-1))),true);
 const ended=restore(before,at(g,8,9*60));assert.equal(catOnVacation(ended.jobCity.profiles[id],cityClock(ended.jobCity,at(g,8,9*60))),false);
 assert.equal(ended.jobCity.profiles[id].schedule.job,p.profession,'normalization before the deadline must not erase the already capacity-checked return assignment');
});
