import {loadGame,saveGame,SAVE_KEY} from './economy.js';

export const WORLD_BACKUP_FORMAT='chichi-world-backup';
export const WORLD_BACKUP_LIMIT=2*1024*1024;
const forbidden=/^(?:password|token|api[_-]?key|private[_-]?key|recovery[_-]?code|authorization|secret)$/i;
function inspect(value){
 if(!value||typeof value!=='object')return;
 for(const [key,child] of Object.entries(value)){
  if(forbidden.test(key)||['__proto__','constructor','prototype'].includes(key))throw Error('Файл содержит служебные или секретные данные.');
  inspect(child);
 }
}
async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function validate(game,now){
 if(!game||game.version!==2||!Number.isSafeInteger(game.coins)||game.coins<0||!Array.isArray(game.placements)||!Array.isArray(game.unlocked))throw Error('Это не поддерживаемое сохранение Чичи.');
 inspect(game);
 const text=JSON.stringify(game),records=new Map([[SAVE_KEY,text]]),storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
 const normalized=loadGame(storage,now,{advance:false,strict:true});
 if(!saveGame(storage,normalized))throw Error('Игровые данные не прошли проверку.');
 return normalized;
}
export async function encodeWorldBackup(game,now=Date.now()){
 // Only the existing game schema is exported, never storage/account/outbox.
 const copy=JSON.parse(JSON.stringify(game));validate(copy,now);
 const payload=JSON.stringify(copy);if(new TextEncoder().encode(payload).length>WORLD_BACKUP_LIMIT-1024)throw Error('Мир превышает поддерживаемый размер резервного файла.');
 const text=JSON.stringify({format:WORLD_BACKUP_FORMAT,formatVersion:1,gameVersion:2,createdAt:new Date(now).toISOString(),integrity:{algorithm:'SHA-256',hash:await digest(payload)},game:copy},null,2);
 if(new TextEncoder().encode(text).length>WORLD_BACKUP_LIMIT)throw Error('Мир превышает поддерживаемый размер резервного файла.');
 return text;
}
export async function decodeWorldBackup(text,now=Date.now()){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>WORLD_BACKUP_LIMIT)throw Error('Файл сохранения слишком большой.');
 let value;try{value=JSON.parse(text);}catch{throw Error('Не удалось прочитать JSON сохранения.');}
 const wrapped=value?.format===WORLD_BACKUP_FORMAT;
 if(wrapped){
  if(value.formatVersion!==1||value.gameVersion!==2)throw Error('Версия резервной копии не поддерживается.');
  if(value.integrity?.algorithm!=='SHA-256'||value.integrity.hash!==await digest(JSON.stringify(value.game)))throw Error('Контрольная сумма не совпала. Файл повреждён или изменён.');
 }else if(value?.version!==2)throw Error('Это не сохранение Чичи.');
 const raw=wrapped?value.game:value,game=validate(raw,now);
 return{game,raw,verified:wrapped,createdAt:wrapped?value.createdAt:null};
}
export function worldBackupName(now=new Date()){
 const pad=x=>String(x).padStart(2,'0');return `CHICHI_WORLD_BACKUP_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
}
export function downloadWorldBackup(text,name=worldBackupName()){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
