import {createResortSpaLift,RESORT_LIFT as L} from './resort-spa-lift.js';
import {RESORT_SPA as S,RESORT_FOOT_OFFSET as F} from './resort-spa-data.js';
import {RESORT_UPPER_APPROACH,RESORT_LOWER_APPROACH} from './resort-spa-access.js';

// The lift owns an existing actor from the first walked step to the last
// landing step. A cancelled trip still exits physically at a safe landing.
export function createResortTransit({navigation,geometry,getActors,centre,canSimulate=()=>true,blocked=()=>false,onArrive=()=>{},onCancel=()=>{}}){
 const lift=createResortSpaLift(),trips=new Map();let serial=0;
 const local=p=>({x:p.x-centre[0],y:p.y,z:p.z-centre[1]}),ground=p=>({...p,y:p.y-S.y}),world=p=>({x:p.x+centre[0],y:p.y,z:p.z+centre[1]});
 const endpoint=f=>({...((f?RESORT_LOWER_APPROACH:RESORT_UPPER_APPROACH)[f?RESORT_LOWER_APPROACH.length-1:0]),y:f?L.lowerY:L.upperY});
 function route(v,points,next){let previous=v.position;const path=[];for(const p of points){const run=navigation.floorPath(ground(previous),ground(p),v.radius);if(!run?.length)return false;path.push(...run.map(p=>({...p,y:p.y+S.y})));previous=p;}v.path=path;v.index=0;v.next=next;v.phase='walk';return true;}
 function exitRoute(v){const sign=lift.state.floor?-1:1,y=lift.state.y,port={x:L.x,y,z:L.z+sign*(L.radius+v.radius+.15)},points=lift.state.floor?RESORT_LOWER_APPROACH:[];
  return route(v,[port,...points.map(p=>({...p,y})),endpoint(lift.state.floor)],'arrived');}
 function finish(v,cancelled=false){const a=getActors().find(a=>a.id===v.id);if(a)Object.assign(a.position,world(v.position));trips.delete(v.id);(cancelled?onCancel:onArrive)(v.id,{floor:lift.state.floor,position:world(v.position),purpose:v.purpose});}
 function move(v,dt){let left=3.6*dt;v.walking=false;while(left>1e-8&&v.index<v.path.length){const p=v.path[v.index],d=Math.hypot(p.x-v.position.x,p.y-v.position.y,p.z-v.position.z);if(d<1e-7){v.index++;continue;}const h=Math.min(left,d,.12),u=h/d,q={x:v.position.x+(p.x-v.position.x)*u,y:v.position.y+(p.y-v.position.y)*u,z:v.position.z+(p.z-v.position.z)*u};if(!navigation.segmentClear(ground(v.position),ground(q),v.radius)||[...trips.values()].some(o=>o!==v&&Math.abs(o.position.y-q.y)<2&&Math.hypot(o.position.x-q.x,o.position.z-q.z)<o.radius+v.radius+.1))return;v.yaw=Math.atan2(p.x-v.position.x,p.z-v.position.z);v.position=q;v.walking=true;left-=h;if(d<=h+1e-7)v.index++;}if(v.index===v.path.length){v.phase=v.next;v.walking=false;}}
 return{lift,trips,has:id=>trips.has(id),frame(id){const v=trips.get(id);return v?{position:world(v.position),yaw:v.yaw,walking:v.walking,phase:v.phase,transport:true,reaction:null}:null;},
  start(id,target,{purpose='visit'}={}){const actor=getActors().find(a=>a.id===id);if(!actor||trips.has(id)||trips.size>=8||![0,1].includes(target)||!canSimulate())return false;const p=local(actor.position),floor=Math.abs(p.y-L.upperY)<.65?0:Math.abs(p.y-L.lowerY)<.65?1:null;if(floor===null||floor===target||!navigation.support(ground(p),actor.radius))return false;const v={id,position:p,radius:actor.radius,from:floor,target,purpose,phase:'waiting',yaw:0,walking:false,order:++serial,cancelled:false};
   // Wait outside the pressure doors, leaving the actual exit sweep free.
   const wait={x:L.x+(v.order%2?1:-1)*1.4,y:p.y,z:L.z+(floor?-1:1)*9};if(!route(v,[wait],'waiting'))return false;trips.set(id,v);return true;},
  cancel(id){const v=trips.get(id);if(!v)return false;v.cancelled=true;if(!lift.passengers.has(id)&&v.phase!=='boarding'){finish(v,true);}return true;},
  update(dt){if(!canSimulate())return;const h=Math.min(.1,Math.max(0,dt));lift.step(h);geometry.update(lift.state);
   for(const v of [...trips.values()]){if(blocked(v.id,v.purpose))v.cancelled=true;
    if(v.phase==='walk'){move(v,h);continue;}
    if(v.phase==='waiting'){
     if(v.cancelled){finish(v,true);continue;}if(lift.state.phase!=='open'||lift.state.floor!==v.from||lift.passengers.size>=L.capacity||[...trips.values()].some(o=>o!==v&&(o.phase==='boarding'||o.phase==='walk'&&o.next==='boarding'||o.exiting)))continue;
     let slot=0;while([...lift.passengers.values()].some(p=>p.slot===slot))slot++;v.slot=slot;if(route(v,[lift.seat(slot)],'boarding'))continue;
    }else if(v.phase==='boarding'){if(lift.board(v.id,v.position))v.phase='riding';}
    else if(v.phase==='riding'){const p=lift.position(v.id);if(p)v.position=p;if(lift.state.phase==='open'&&lift.state.floor===v.target){if([...trips.values()].some(o=>o!==v&&o.exiting))continue;if(lift.beginExit(v.id)&&exitRoute(v))v.exiting=true;}}
    else if(v.phase==='arrived'){if(v.exiting&&!lift.finishExit(v.id,v.position,v.radius))continue;finish(v,v.cancelled);}
   }
   if(lift.state.phase==='open'){
    const aboard=[...trips.values()].filter(v=>lift.passengers.has(v.id));
    if(aboard.length&&aboard.every(v=>v.phase==='riding')&&aboard.every(v=>v.target!==lift.state.floor))lift.depart(aboard[0].target);
    else if(!lift.passengers.size&&![...trips.values()].some(v=>v.phase==='boarding'||v.exiting)){
     const waiting=[...trips.values()].find(v=>v.phase==='waiting'&&v.from!==lift.state.floor);if(waiting)lift.depart(waiting.from);
    }
   }
  },clear(){for(const v of [...trips.values()]){if(lift.state.phase==='open'&&!lift.passengers.has(v.id))finish(v,true);else v.cancelled=true;}},
 };
}
