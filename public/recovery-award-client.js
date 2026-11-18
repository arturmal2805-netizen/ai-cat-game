import {RECOVERY_WORLD_HASH} from './recovery-award-data.js';
export async function recoverAuthorizedBalance(cloud,{storage,load,save,fetcher=fetch,allowedHash=RECOVERY_WORLD_HASH}){
 if(!cloud.token)return false;
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cloud.token)))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==allowedHash)return false;
 await cloud.flush();if(cloud.pending||cloud.retryEntry||cloud.running||cloud.conflict)return false;
 const response=await fetcher(cloud.url,{method:'POST',headers:{'Content-Type':'application/json','X-Chichi-Save-Token':cloud.token},body:JSON.stringify({action:'recovery-compensation'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Восстановительное начисление пока недоступно.');
 const result=await response.json();if(result.alreadyApplied)return false;
 await cloud.recover(cloud.token,raw=>{const game=load({getItem:key=>key==='chichi-world-v2'?JSON.stringify(raw):null});if(!save(storage,game))throw Error('Не удалось сохранить восстановленную копию.');});return true;
}
