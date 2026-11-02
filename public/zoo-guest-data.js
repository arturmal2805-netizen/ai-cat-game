import {ZOO_ANIMALS,ZOO_EXHIBITS} from './zoo-data.js';
import {JOB_MINUTE_MS,JOB_DAY_MINUTES} from './jobcity-data.js';
export const ZOO_GUEST_MS=JOB_MINUTE_MS*JOB_DAY_MINUTES/2;
export const zooAnimalId=(species,index)=>`zoo-${species}-${index}`;
export function zooGuestAnimal(id){
 for(const e of ZOO_EXHIBITS)for(let index=0;index<ZOO_ANIMALS[e.species].count;index++)if(id===zooAnimalId(e.species,index))return {id,species:e.species,index,exhibit:e};
 return null;
}
const text=v=>typeof v==='string'&&v.length>0&&v.length<=160&&!/[\u0000-\u001f]/.test(v),stamp=v=>Number.isSafeInteger(v)&&v>0&&v<1e15;
export function normalizeZooGuests(raw){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const e of ZOO_EXHIBITS)for(let i=0;i<ZOO_ANIMALS[e.species].count;i++){
  const key=zooAnimalId(e.species,i),v=raw[key];
  if(!v||!text(v.id)||v.animalId!==key||!text(v.houseId)||!stamp(v.startedAt)||v.endsAt!==v.startedAt+ZOO_GUEST_MS||!stamp(v.endsAt)||v.cancelledAt!==undefined&&(!stamp(v.cancelledAt)||v.cancelledAt<v.startedAt))continue;
  out[key]={id:v.id,animalId:key,houseId:v.houseId,startedAt:v.startedAt,endsAt:v.endsAt,...(v.cancelledAt?{cancelledAt:v.cancelledAt}:{})};
 }
 return out;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const immutable=v=>v&&[v.id,v.animalId,v.houseId,v.startedAt,v.endsAt];
// Bounded latest-event ledger. Legacy clients cannot erase it; an old queued
// start cannot revive an expired/cancelled visit or extend its deadline.
export function mergeZooGuests(base,current,incoming){
 const b=normalizeZooGuests(base),c=normalizeZooGuests(current),n=normalizeZooGuests(incoming),out={...c};
 for(const [key,change]of Object.entries(n)){
  const old=b[key],actual=c[key];if(same(old,change))continue;
  if(old?.id===change.id){
   if(!same(immutable(old),immutable(change))||old.cancelledAt&&!change.cancelledAt)throw Error('Не можна змінювати збережений гостьовий візит.');
   if(actual?.id===change.id)out[key]={...actual,...(change.cancelledAt?{cancelledAt:Math.max(actual.cancelledAt||0,change.cancelledAt)}:{})};
   continue;
  }
  if(actual?.id===change.id){if(!same(immutable(actual),immutable(change)))throw Error('Не можна змінювати збережений гостьовий візит.');out[key]={...actual,...(change.cancelledAt?{cancelledAt:Math.max(actual.cancelledAt||0,change.cancelledAt)}:{})};continue;}
  if(actual&&actual.id!==old?.id){if(same(actual,change))continue;throw Error('Ця тварина вже має інший візит. Оновіть гру.');}
  if(actual&&change.startedAt<actual.endsAt&&!actual.cancelledAt)throw Error('Попередній візит ще триває.');
  if(actual&&change.startedAt<Math.max(actual.startedAt,actual.cancelledAt||0))throw Error('Застарілий гостьовий візит.');
  out[key]={...change};
 }
 return out;
}
