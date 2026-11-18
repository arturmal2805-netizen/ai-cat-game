import {RECOVERY_AWARD_ID,RECOVERY_TARGET as TARGET} from './public/recovery-award-data.js';
import {ensureJobCity} from './public/jobcity-system.js';
// Called only after authenticating the one authorized player's world.
export async function applyRecoveryAward(transaction,now=Date.now()){
 const current=await transaction.get('current');if(!current?.game)throw Error('Сохранение мира не найдено.');
 if(await transaction.get(RECOVERY_AWARD_ID))return{game:current.game,revision:current.revision,alreadyApplied:true};
 for(const source of ['current','previous','older']){const snapshot=await transaction.get(source);if(snapshot)await transaction.put(RECOVERY_AWARD_ID+':before:'+source,snapshot);}
 let game=structuredClone(current.game);const delta=Math.max(0,TARGET.coins-game.coins);game.coins+=delta;game.diamonds=Math.max(game.diamonds||0,TARGET.diamonds);game.totalEarned=(game.totalEarned||0)+delta;
 game.unlocked=[...new Set([...game.unlocked,'autumn'])];
 game=ensureJobCity(game,now,{forMall:true});
 for(const [id,p]of Object.entries(game.jobCity?.profiles||{})){const amount=Math.max(0,TARGET.catCoins-p.coins);if(!amount)continue;p.coins+=amount;p.earnedTotal=(p.earnedTotal||0)+amount;p.transactions=[...(p.transactions||[]),{id:RECOVERY_AWARD_ID+'-'+id,kind:'recovery',amount,at:now}].slice(-12);}
 const previous=await transaction.get('previous');if(previous)await transaction.put('older',previous);await transaction.put('previous',current);
 const save={game,revision:current.revision+1,savedAt:now,lastMutationId:RECOVERY_AWARD_ID};await transaction.put('current',save);await transaction.put(RECOVERY_AWARD_ID,{at:now,revision:save.revision});
 return{game,revision:save.revision,alreadyApplied:false};
}
