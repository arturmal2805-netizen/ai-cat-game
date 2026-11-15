import {JOB_KINDS,JOB_START,JOB_DAY_MINUTES} from './jobcity-data.js';

export const VACATION_MIN_DAYS=2,VACATION_MAX_DAYS=7;
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x85ebca6b);return (n^(n>>>13))>>>0;};
export function normalizeCatVacation(raw){
  if(raw==null)return null;
  const {startDay,endDay,previousJob}=raw;
  if(!Number.isSafeInteger(startDay)||startDay<0||!Number.isSafeInteger(endDay)||endDay-startDay<VACATION_MIN_DAYS||endDay-startDay>VACATION_MAX_DAYS||!JOB_KINDS.includes(previousJob))throw Error('Пошкоджений збережений термін відпустки котика.');
  return {startDay,endDay,previousJob};
}
export function catOnVacation(profile,clock){
  const v=profile?.vacation;if(!v)return false;
  if(typeof clock==='number')return clock>=v.startDay&&clock<v.endDay;
  return clock.absolute>=v.startDay*JOB_DAY_MINUTES+JOB_START&&clock.absolute<v.endDay*JOB_DAY_MINUTES+JOB_START;
}
export function vacationDaysLeft(profile,clock){
  return catOnVacation(profile,clock)?Math.ceil((profile.vacation.endDay*JOB_DAY_MINUTES+JOB_START-clock.absolute)/JOB_DAY_MINUTES):0;
}
export function reconcileCatVacation(base,current,incoming){
  const old=normalizeCatVacation(base),actual=normalizeCatVacation(current),proposed=normalizeCatVacation(incoming);
  const same=(a,b)=>a.startDay===b.startDay&&a.endDay===b.endDay&&a.previousJob===b.previousJob;
  if(old&&actual&&old.startDay===actual.startDay&&!same(old,actual))throw Error('Збережений термін відпустки не можна змінювати.');
  const known=!old?actual:!actual?old:actual.startDay>=old.startDay?actual:old;
  if(!proposed)return known;
  if(!known)return proposed;
  if(proposed.startDay<known.startDay)return known;
  if(proposed.startDay===known.startDay){if(!same(proposed,known))throw Error('Збережений термін відпустки не можна продовжувати.');return known;}
  if(proposed.startDay<known.endDay+14)throw Error('Попередня відпустка та перерва між відпустками ще не завершені.');
  return proposed;
}
// Called by the existing once-per-day local planner. A deterministic shared
// draw makes reloads/retries idempotent; no extra AI call or timer is created.
export function planCatVacations(game,day){
  const state=game.jobCity;if(!state||state.plan?.day===day)return game;
  const ids=new Set((game.adoption?.cats||[]).map(c=>c.id));
  const adopted=Object.values(state.profiles).filter(p=>ids.has(p.id));
  if(adopted.some(p=>p.vacation?.startDay===day))return game;
  const active=adopted.filter(p=>catOnVacation(p,day)).length;
  if(active>=Math.max(1,Math.ceil(adopted.length/4)))return game;
  const candidates=adopted.filter(p=>JOB_KINDS.includes(p.profession)&&!p.careerAIPending&&p.lastPaidDay>=0&&p.lastPaidDay<day&&(!p.vacation||day>=p.vacation.endDay+14)).map(p=>({p,roll:hash(`${state.epoch}:${p.id}:${day}`)})).filter(c=>c.roll%13===0).sort((a,b)=>a.roll-b.roll||a.p.id.localeCompare(b.p.id));
  const selected=candidates[0];if(!selected)return game;
  const next=structuredClone(game),p=next.jobCity.profiles[selected.p.id];
  p.vacation={startDay:day,endDay:day+VACATION_MIN_DAYS+hash(`days:${state.epoch}:${p.id}:${day}`)%(VACATION_MAX_DAYS-VACATION_MIN_DAYS+1),previousJob:p.profession};
  return next;
}
