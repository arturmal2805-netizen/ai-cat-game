import {mallStore} from './mall-data.js';

// Floor zero is the surface queue, not the Mall. Elevator passengers also
// remain outside the floor camera until they have physically landed.
export function mallCameraGuests(actors,visits,ambient=[]){
  const guests=[];
  for(const actor of actors){
    const visit=visits.get(actor.id),store=mallStore(visit?.storeId);
    if(!actor.model?.userData.head||!actor.carrier?.parent||!store||visit.floor<1||visit.floor>7||['boarded','riding','queue'].includes(visit.phase))continue;
    guests.push({...actor,floor:visit.floor,ambient:false});
  }
  for(const guest of ambient){
    if(guest.roomGuest||!guest.cat?.userData.head||!guest.carrier?.parent||guest.floor<1||guest.floor>7)continue;
    guests.push({...guest,model:guest.cat,ambient:true});
  }
  return guests;
}

export function randomMallGuest(guests,previous,random=Math.random){
  const alternatives=guests.filter(g=>g.id!==previous),pool=alternatives.length?alternatives:guests;
  return pool.length?pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))]:null;
}
