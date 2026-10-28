import {cityClock} from './jobcity-system.js';
import {activeCats} from './cat-roster.js';
// A recall is a manual invitation. Work and an existing sleep stay in place.
export function canGatherCat(game,id,now=Date.now(),state={}){
 if(state.working||state.sleeping||id==='chichi'&&game.care?.resting)return false;
 const p=game.jobCity?.profiles?.[id];if(!p)return true;
 const clock=cityClock(game.jobCity,now);
 return !(clock.working&&p.schedule?.day===clock.day&&p.schedule.job!=='rest'&&p.schedule.job);
}
export function gatherCandidates(game,now=Date.now(),state=()=>({})){
 return ['chichi',...activeCats(game).map(c=>c.id)].filter(id=>canGatherCat(game,id,now,state(id)));
}
// Clear the old evening/manual anchor without changing balances, profession,
// itinerary history or a sleeping partner. Cancellation uses native runtimes.
export function releaseGatherOverrides(actor,until){
 actor.leisureBiome=null;actor.manualAnchor=null;actor.manualUntil=until;
}

// Manual recall uses the same finite magical transfer as Chichi. It is not
// ordinary ground wandering: the giant park is hundreds of metres across.
// The elevated middle of a long transfer clears intervening shores/scenery;
// both ends remain exact and a new/manual action can cancel it in place.
export function gatherTrip(from,to,start){
 const length=Math.hypot(to.x-from.x,to.z-from.z);
 return {from:{x:from.x,y:from.y,z:from.z},to:{...to},start,
  duration:Math.max(1800,Math.min(18000,length*180)),
  height:length>40?Math.min(85,length*.12):0};
}
export function gatherFrame(trip,now){
 const t=Math.max(0,Math.min(1,(now-trip.start)/trip.duration)),q=t*t*(3-2*t),
  from=trip.from,to=trip.to;
 return {position:t===1?{...to}:{x:from.x+(to.x-from.x)*q,z:from.z+(to.z-from.z)*q,
  y:from.y+(to.y-from.y)*q+Math.sin(Math.PI*t)*trip.height},
  yaw:Math.atan2(to.x-from.x,to.z-from.z),walking:t<1&&!trip.height,
  reaction:t<1&&trip.height?{paw:.18,headPitch:-.06}:null,done:t===1};
}
// Bounded deterministic landing search. Work with actual rest-anatomy radii,
// native walkability and already reserved arrivals, never the island centre.
export function gatherLanding(arrival,radius,reserved,walkable,maxDistance=30){
 const clear=p=>walkable(p,radius)&&reserved.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=radius+q.radius+.25);
 if(clear(arrival))return {...arrival,radius};
 const step=Math.max(.65,radius*.8);
 for(let r=step;r<=maxDistance;r+=step){
  const count=Math.ceil(2*Math.PI*r/step);
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2,p={x:arrival.x+Math.cos(a)*r,z:arrival.z+Math.sin(a)*r};
   if(clear(p))return {...p,radius};
  }
 }
 return null;
}
