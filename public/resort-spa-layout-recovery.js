import {RESORT_LEGACY_ZONES} from './resort-spa-data.js';
import {SPA_PALACE as P,spaPalaceContains,spaTicketDestination} from './resort-spa-layout-v7.js';
import {spaV7Service,spaV7Seat} from './resort-spa-services-v7.js';
// Only old supported floor/contact bands in the SPA, never arbitrary ocean Y.
// Actual swimming/exploration owns Chichi and takes priority over layout repair.
export function resortPalaceRecovery(game){
 const out=new Map();if(!game.unlocked?.includes('autumn'))return out;
 for(const[id,p]of Object.entries(game.catLocations||{})){
  if(p.biome!=='autumn'||p.spaLayout===7||![p.x,p.y,p.z].every(Number.isFinite)||id==='chichi'&&(game.mosasaurSubmarine?.active||game.mosasaurSubmarine?.explorer))continue;
  const z=p.z-P.offsetZ,goal=game.jobCity?.profiles[id]?.mall?.goal?.storeId;
  const rooms=RESORT_LEGACY_ZONES.filter(r=>Math.hypot((p.x-r.x)/r.rx,(z-r.z)/r.rz)<=1.025&&[.012,.812,.932,1.032,-.9].some(h=>Math.abs(p.y-r.y-h)<.18));
  let room=rooms.find(r=>r.id===goal)||rooms.sort((a,b)=>Math.hypot(p.x-a.x,z-a.z)-Math.hypot(p.x-b.x,z-b.z))[0];
  // The old public atrium has no service address. Its floor bands are exact.
  const atrium=!room&&Math.hypot(p.x,z-203)<34&&[0,9,18].some(y=>Math.abs(p.y-P.baseY-y-.012)<.18);
  if(!room&&!atrium)continue;
  const destination=room?spaTicketDestination(room.id):null,retired=room?.key&&['nap','meditation','beauty','sauna'].includes(room.key);
  const target=destination&&!retired?spaV7Seat(spaV7Service(destination),destination==='resort-vip'?18:0).approach:{x:p.x,y:P.baseY+.012,z};
  out.set(id,{saved:{...p},oldRoom:room?.id||null,destination:retired?null:destination,target:{...target},retired:!!retired,goalId:goal,goalAt:game.jobCity?.profiles[id]?.mall?.goal?.at??null});
 }
 return out;
}
// A supported, full-body-clear point is required. Multiple recovering cats
// reserve disjoint places before any actor is moved. No wallet/receipt writes.
export const spaPalaceCommonHall=(x,z)=>Math.abs(x)<=35&&z>=235&&z<=244||Math.abs(x)<=20&&z>=287&&z<=289;
export function resolvePalaceRecovery(records,navigation,actors){
 const result=new Map(),reserved=[];
 for(const[id,r]of records){const actor=actors.find(a=>a.id===id);if(!actor)continue;const radius=actor.radius||.571,centres=r.retired?[{x:Math.max(-33,Math.min(33,r.saved.x)),z:Math.max(236,Math.min(243,r.saved.z-P.offsetZ))},{x:0,z:238},{x:0,z:287}]:[r.target,{x:0,z:238},{x:0,z:287}];let chosen=null;
  for(const centre of centres){for(let ring=0;ring<=16&&!chosen;ring++){const n=ring?ring*8:1;for(let j=0;j<n;j++){const angle=j*Math.PI*2/n,x=centre.x+Math.cos(angle)*ring*1.5,z=centre.z+Math.sin(angle)*ring*1.5,y=r.retired||!('y'in centre)?P.baseY+.012:centre.y;if(!spaPalaceContains(x,z,radius+.2)||r.retired&&!spaPalaceCommonHall(x,z))continue;const q={x,y:y-P.baseY,z},hit=navigation.support(q,radius);if(!hit||Math.abs(hit.y-q.y)>.05||reserved.some(p=>Math.abs(p.y-hit.y)<2.2&&Math.hypot(p.x-x,p.z-z)<p.radius+radius+.2))continue;chosen={x,y:hit.y+P.baseY,z};break;}}if(chosen)break;}
  if(chosen){result.set(id,chosen);reserved.push({...chosen,y:chosen.y-P.baseY,radius});}
 }
 return result;
}

// Preparation is asynchronous. A newer command/position always wins over the
// startup repair; cancelling transient recovery never deletes durable data.
export function prunePalaceRecovery(records,game){
 for(const[id,r]of records){const p=game.catLocations?.[id],goal=game.jobCity?.profiles[id]?.mall?.goal;
  if(!p||p.spaLayout===7||['biome','x','y','z','yaw','at'].some(k=>p[k]!==r.saved[k])||goal?.storeId!==r.goalId||(goal?.at??null)!==r.goalAt||id==='chichi'&&(game.mosasaurSubmarine?.active||game.mosasaurSubmarine?.explorer))records.delete(id);
 }return records;
}

// A procedure owns an elevated/wet pose only in memory. Persist a real dry
// approach for cold reload, without moving the live actor or touching receipts.
export function palaceProcedureSavePositions(visits,navigation,actors){
 const records=new Map();
 for(const[id,v]of visits){if(!v.contact||!['mount','procedure','dismount'].includes(v.phase)&&!v.phase.startsWith('wet-'))continue;
  records.set(id,{target:{...v.contact.approach},saved:{...v.returnTo},retired:false});
 }
 const resolved=resolvePalaceRecovery(records,navigation,actors);
 return new Map([...records.keys()].map(id=>[id,resolved.get(id)||null]));
}
