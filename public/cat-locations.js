import {BIOMES,byBiome} from './game-data.js';
import {activeCats} from './cat-roster.js';
import {HOUSING_ID,HOUSING_SECTION_PITCH,housingSectionCount} from './housing-data.js';

function inIsland(p,b,game){
  if(!b||!game.unlocked.includes(b.id))return false;
  let x=p.x;
  if(b.id===HOUSING_ID){
    const section=Math.max(0,Math.round(-x/HOUSING_SECTION_PITCH));
    if(section>=housingSectionCount(game.housing))return false;
    x+=section*HOUSING_SECTION_PITCH;
  }
  return Math.hypot(x,p.z)<(b.radius||11.65)-.2;
}
export function normalizeCatLocations(raw,game,now=Date.now()){
  const ids=new Set(['chichi',...activeCats(game).map(n=>n.id)]),out={};
  for(const id of ids){
    const p=raw?.[id];
    if(!p||![p.x,p.y,p.z,p.yaw,p.at].every(Number.isFinite)||
       p.y < -400 || p.y>120 || p.at<0 || p.at>now+300000 ||
       !inIsland(p,byBiome(p.biome),game))continue;
    out[id]={biome:p.biome,x:p.x,y:p.y,z:p.z,yaw:p.yaw,at:p.at};
  }
  return out;
}
// Called only at existing durable saves and page hide, never from the RAF or
// an AI timer. Incoming player commands always beat the old rendered position.
export function captureCatLocations(next,previous,actors,now=Date.now()){
  const locations=normalizeCatLocations(next.catLocations,next,now),destinations={...next.catDestinations};
  let catPosition=next.catPosition;
  const ids=new Set(['chichi',...activeCats(next).map(n=>n.id)]);
  for(const a of actors){
    if(!ids.has(a.id)||a.transient)continue;
    const commanded=a.id==='chichi'
      ? JSON.stringify(next.catPosition)!==JSON.stringify(previous.catPosition)
      : next.catDestinations?.[a.id]!==previous.catDestinations?.[a.id];
    if(commanded){delete locations[a.id];continue;}
    for(const b of BIOMES){
      const p={biome:b.id,x:a.position.x-b.center[0],y:a.position.y,z:a.position.z-b.center[1],yaw:a.yaw,at:now};
      if(![p.x,p.y,p.z,p.yaw].every(Number.isFinite)||!inIsland(p,b,next))continue;
      locations[a.id]=p;
      if(a.id==='chichi')catPosition={biome:p.biome,x:p.x,z:p.z};
      else destinations[a.id]=p.biome;
      break;
    }
  }
  return {...next,catLocations:locations,catDestinations:destinations,catPosition};
}

export function mergeCatLocations(current,incoming){
  const result=structuredClone(current||{});
  for(const [id,p] of Object.entries(incoming||{}))
    if(p&&Number.isFinite(p.at)&&(!result[id]||p.at>=result[id].at))result[id]=structuredClone(p);
  return result;
}
