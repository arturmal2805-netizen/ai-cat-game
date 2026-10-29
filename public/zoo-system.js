import {ZOO_ID,ZOO_EXHIBITS,ZOO_RETIRED_EXHIBIT,zooExhibit} from './zoo-data.js';
export const newZoo=()=>({version:1,receipts:{}});
export function zooSnapshotValid(raw){
 if(raw===undefined||raw===null)return true;
 if(raw.version!==1||!raw.receipts||typeof raw.receipts!=='object'||Array.isArray(raw.receipts))return false;
 const entries=Object.entries(raw.receipts);if(entries.length>5)return false;
 for(const [id,p]of entries){const e=zooExhibit(id)||(id===ZOO_RETIRED_EXHIBIT.id?ZOO_RETIRED_EXHIBIT:null);if(!e||!e.index||!p||p.id!==`opened-${id}`||p.price!==e.price||!Number.isSafeInteger(p.openedAt)||p.openedAt<=0||p.openedAt>=1e15)return false;}
 if(raw.receipts[ZOO_RETIRED_EXHIBIT.id]&&!raw.receipts['zoo-otter'])return false;
 // Every paid receipt is permanent; opening is deliberately progressive.
 for(let i=1;i<ZOO_EXHIBITS.length;i++)if(raw.receipts[ZOO_EXHIBITS[i].id]&&i>1&&!raw.receipts[ZOO_EXHIBITS[i-1].id])return false;
 return true;
}
export function normalizeZoo(raw){if(!zooSnapshotValid(raw))throw Error('Пошкоджено збереження зоопарку.');return raw?{version:1,receipts:Object.fromEntries(Object.entries(raw.receipts).map(([k,v])=>[k,{id:v.id,price:v.price,openedAt:v.openedAt}]))}:newZoo();}
export const zooIsOpen=(game,id)=>{const e=zooExhibit(id);return !!e&&!!game.unlocked?.includes(ZOO_ID)&&(!e.index||!!game.zoo?.receipts?.[e.id]);};
export function zooProject(game,id){const e=zooExhibit(id);if(!e||!game.unlocked.includes(ZOO_ID))return null;const built=zooIsOpen(game,e.id);return{...e,built,unstarted:!built,readyAt:0,startedAt:game.zoo?.receipts?.[e.id]?.openedAt||0,progress:built?1:0,previousOpen:!e.index||zooIsOpen(game,ZOO_EXHIBITS[e.index-1].id)};}
export function openZooExhibit(game,id,now=Date.now()){
 const p=zooProject(game,id);if(!p)throw Error('Спочатку відкрийте Чарівний зоопарк.');
 if(p.built)throw Error('Цей вольєр уже відкрито. Повторна оплата не потрібна.');
 if(!p.previousOpen)throw Error('Спочатку відкрийте попередній вольєр.');
 if(!Number.isSafeInteger(now)||now<=0||now>=1e15)throw Error('Недійсний час відкриття.');
 if(game.coins<p.price)throw Error(`Потрібно ще ${p.price-game.coins} монет.`);
 const next=structuredClone(game);next.zoo=normalizeZoo(game.zoo);next.coins-=p.price;
 next.zoo.receipts[p.id]={id:`opened-${p.id}`,price:p.price,openedAt:now};return next;
}
export function mergeZoo(base,current,incoming){
 const b=normalizeZoo(base),c=normalizeZoo(current);if(incoming===undefined||incoming===null)return c;
 const n=normalizeZoo(incoming),out=normalizeZoo(c);
 for(const e of [...ZOO_EXHIBITS.slice(1),ZOO_RETIRED_EXHIBIT]){
  const old=b.receipts[e.id],actual=c.receipts[e.id],change=n.receipts[e.id];
  if(old&&change&&JSON.stringify(old)!==JSON.stringify(change))throw Error('Історію відкриття вольєра не можна змінювати.');
  if(!old&&change){if(e.id===ZOO_RETIRED_EXHIBIT.id)throw Error('Тигровий вольєр прибрано. Оплату скасовано; оновіть гру.');if(actual)throw Error('Вольєр уже відкрили на іншому пристрої. Повторну оплату скасовано.');out.receipts[e.id]={...change};}
 }
 if(!zooSnapshotValid(out))throw Error('Некоректна послідовність відкриття вольєрів.');return out;
}
