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
