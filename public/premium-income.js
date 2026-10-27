import {levelForXP,MAX_LEVEL,xpForLevel} from './progression.js';
// Premium parks have large registers. Keep unpaid coins in the existing
// register clock rather than overflowing the established save-wallet limit.
export function premiumCollectible(game,due,rate,xpRate,remainder=0){
  const room=Math.max(0,10000000-game.coins),before=levelForXP(game.progression.xp);
  const fits=amount=>{
    const gain=Math.min(Math.floor(remainder+amount*xpRate/rate+1e-9),Math.max(0,xpForLevel(MAX_LEVEL)-game.progression.xp));
    const after=levelForXP(game.progression.xp+gain),levels=after-before,
      bonus=levels*30+15*(after*(after+1)-before*(before+1))/2;
    return amount+bonus<=room;
  };
  let lo=0,hi=Math.min(Math.floor(due),room);if(fits(hi))return hi;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fits(mid))lo=mid;else hi=mid-1;}
  return lo;
}
