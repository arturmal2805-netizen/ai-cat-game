// Transient occupancy belongs to the existing simulation owner. Durable paid
// tickets stay in the existing purchase ledger; a lost runtime never bills.
import {RESORT_ZONES,resortZone} from './resort-spa-data.js';
export const RESORT_SEAT_STATES=Object.freeze(['Available','Reserved','Occupied','Cleaning','Unavailable']);
export function createResortSpaBooking({cleanSeconds=8,reservationSeconds=180}={}){
 const seats=new Map(RESORT_ZONES.flatMap(zone=>Array.from({length:zone.seats},(_,slot)=>[zone.id+':'+slot,{id:zone.id+':'+slot,zoneId:zone.id,slot,state:'Available',owner:null,until:0,generation:0}]))),owners=new Map();
 const reset=(s,state='Available',until=0)=>{if(s.owner)owners.delete(s.owner);s.owner=null;s.state=state;s.until=until;s.generation++;};
 function release(id,time=0){const s=owners.get(id);if(!s)return false;reset(s,s.state==='Occupied'?'Cleaning':'Available',s.state==='Occupied'?time+cleanSeconds:0);return true;}
 function step(time){for(const s of seats.values())if((s.state==='Cleaning'||s.state==='Reserved')&&time>=s.until)reset(s);}
 return{seats,step,get:id=>owners.get(id)||null,
  reserve(id,zoneId,time=0){if(!resortZone(zoneId)||typeof id!=='string'||!id)return null;step(time);const prior=owners.get(id);if(prior?.zoneId===zoneId)return prior;if(prior)return null;const s=[...seats.values()].find(s=>s.zoneId===zoneId&&s.state==='Available');if(!s)return null;s.state='Reserved';s.owner=id;s.until=time+reservationSeconds;s.generation++;owners.set(id,s);return s;},
  occupy(id,time=0){step(time);const s=owners.get(id);if(!s||s.state!=='Reserved')return false;s.state='Occupied';s.until=0;return true;},release,
  available(zoneId,time=0){step(time);return[...seats.values()].filter(s=>s.zoneId===zoneId&&s.state==='Available').length;},
  setUnavailable(seatId,value=true){const s=seats.get(seatId);if(!s||s.owner||s.state==='Cleaning')return false;reset(s,value?'Unavailable':'Available');return true;},
  clear(){owners.clear();for(const s of seats.values())reset(s);},
 };
}
