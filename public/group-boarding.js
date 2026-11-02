import * as T from 'three';

export const GROUP_WAIT_MS = 15000, GROUP_MOUNT_MS = 1100;
const smooth=u=>{u=T.MathUtils.clamp(u,0,1);return u*u*(3-2*u);};

// Continue the ordinary ground path along the authored stairs/deck. Only the
// dry prefix moves to approach; the actual wet/ballistic route is untouched.
export function groupApproach(route, ground, seats) {
  const queueTime=route.boardingStart-Math.min(1.1,route.legs.find(l=>l.start+l.duration===route.boardingStart).duration*.4),
    queues=Array.from({length:seats},(_,i)=>route.frame(queueTime,false,i).position),
    lane=b=>{let best=0,d=Infinity;queues.forEach((p,i)=>{const s=p.reduce((v,x,k)=>v+(x-b[k])**2,0);if(s<d){d=s;best=i;}});return best;},
    plan=(a,b)=>{const i=lane(b),entry=route.frame(0,false,i).position,ms=ground.duration(a,entry);return {i,entry,ms,total:ms+queueTime*1000};};
  return {queues,queueTime,
    duration(a,b){return plan(a,b).total;},
    frame(a,b,u){const p=plan(a,b),t=T.MathUtils.clamp(u,0,1)*p.total;return t<=p.ms?ground.frame(a,p.entry,t/p.ms):route.frame(Math.min(queueTime,(t-p.ms)/1000),false,p.i).position;},
    yaw(a,b,u){const p=plan(a,b),t=T.MathUtils.clamp(u,0,1)*p.total;if(t<=p.ms)return ground.yaw(a,p.entry,t/p.ms);const f=route.frame(Math.min(queueTime,(t-p.ms)/1000),false,p.i),q=new T.Quaternion().fromArray(f.quaternion);return new T.Euler().setFromQuaternion(q,'YXZ').y;},
  };
}

export function beginGroupBoarding(g,ticket,now) {
  if(ticket.group)return ticket.launchAt;
  const d=g.userData;
  let group=d.waterGroup;
  if(!group || group.departureAt!==null && now+GROUP_MOUNT_MS>group.departureAt) {
    group={availableAt:Math.max(now,group?.returnAt??now),seatedAt:null,departureAt:null,returnAt:null};
    d.waterGroup=group;
  }
  ticket.group=group;ticket.boardAt=Math.max(now,group.availableAt);
  ticket.launchAt=group.departureAt??Infinity;
  return ticket.launchAt;
}

// Called by both native hero and resident queues. The first real seated frame
// starts the countdown, never a reservation or the arrival at the island base.
export function groupBoardingFrame(g,ticket,now,reduced=false) {
  beginGroupBoarding(g,ticket,now);
  const d=g.userData,route=d.route,group=ticket.group,
    u=T.MathUtils.clamp((now-ticket.boardAt)/GROUP_MOUNT_MS,0,1),
    seatTime=route.boardingStart+.6,
    seat=route.frame(seatTime,false,ticket.lane),
    position=ticket.queue.map((x,i)=>x+(seat.position[i]-x)*smooth(u));
  ticket.seated=u>=1;
  if(ticket.seated&&group.seatedAt===null){
    group.seatedAt=now;group.departureAt=now+GROUP_WAIT_MS;
    group.returnAt=group.departureAt+(route.duration-route.boardingEnd)*1000+1500;
    for(const r of d.slideRiders.values())if(r.group===group)r.launchAt=group.departureAt;
  }
  const departed=ticket.seated&&group.departureAt!==null&&now>=group.departureAt;
  if(departed){ticket.routeOffset=route.boardingEnd;ticket.launchAt=group.departureAt;}
  ticket.elapsed=now<ticket.boardAt?null:departed?route.boardingEnd+(now-group.departureAt)/1000:seatTime;
  const current=departed?route.frame(ticket.elapsed,false,ticket.lane):seat,
    reaction={...(d.rideReaction?.(ticket.elapsed??seatTime,reduced,ticket.lane)||{})};
  if(!departed){reaction.rideSit=reduced?0:smooth(u);reaction.weight=reduced?0:smooth(u);}
  d.update?.(now/1000,reduced);
  return {...current,position:departed?current.position:position,walking:departed?current.walking:u>0&&u<1,departed,reaction};
}

// Pure bounded selection: the world supplies its existing work/care/manual
// exclusions. No model requests, timers per cat, cross-island transfers or AI.
export function boardingCandidates(candidates,{seats,now,departureAt=null}) {
  return candidates.filter(c=>!c.busy&&c.sameIsland&&Number.isFinite(c.travelMs)&&
    (departureAt===null||now+c.travelMs+GROUP_MOUNT_MS<departureAt))
    .sort((a,b)=>a.travelMs-b.travelMs||a.id.localeCompare(b.id)).slice(0,seats);
}
