import {RESORT_LIFT as L} from './resort-spa-lift.js';
import {RESORT_SPA as S} from './resort-spa-data.js';
// The existing durable catLocations are enough to reconstruct a moving cabin.
// No parallel save field, wallet mutation or alteration of world merge rules.
export function resortLiftRecovery(game){const out=new Map();if(game.mosasaurSubmarine?.active||game.mosasaurSubmarine?.explorer)return out;for(const[id,p]of Object.entries(game.catLocations||{})){
 if(p.biome!=='autumn'||!Number.isFinite(p.y)||p.y<L.lowerY-.01||p.y>L.upperY+.01)continue;const z=p.z-S.offsetZ;
 for(let slot=0;slot<L.capacity;slot++)if(Math.hypot(p.x-(L.x+(slot%2?1.5:-1.5)),z-(L.z+(slot<2?-1.5:1.5)))<.05){out.set(id,{...p,local:{x:p.x,y:p.y,z}});break;}
 }return out;}
