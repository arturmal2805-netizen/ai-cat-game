import {MALL_PRODUCTS,mallProduct,mallStore} from './mall-data.js';
const clone=v=>structuredClone(v);
export const newMallProfile=()=>({version:1,receipts:{},used:{},equipped:null,goal:null,visited:[]});
export function normalizeMallProfile(raw){
  if(raw==null)return newMallProfile();
  if(raw.version!==1||!raw.receipts||Array.isArray(raw.receipts)||Object.keys(raw.receipts).length>10000)throw Error('Пошкоджена історія покупок ТРЦ');
  const m=newMallProfile();
  for(const [id,r]of Object.entries(raw.receipts)){
    const product=mallProduct(r?.product);
    if(!/^[\w-]{8,80}$/.test(id)||!product||!Number.isSafeInteger(r.sequence)||r.sequence<1||r.price!==product.price||!Number.isFinite(r.at)||r.at<0)throw Error('Пошкоджений чек ТРЦ');
    m.receipts[id]={product:r.product,sequence:r.sequence,price:r.price,at:r.at};
  }
  for(const [id,n]of Object.entries(raw.used||{})){
    if(!mallProduct(id)||!Number.isSafeInteger(n)||n<0||n>Object.values(m.receipts).filter(r=>r.product===id).length)throw Error('Пошкоджений інвентар ТРЦ');
    m.used[id]=n;
  }
  m.equipped=mallProduct(raw.equipped)?.use==='wear'?raw.equipped:null;
  m.visited=[...new Set((raw.visited||[]).filter(id=>mallStore(id)))];
  if(raw.goal&&mallStore(raw.goal.storeId)&&Number.isFinite(raw.goal.at)){
    const product=mallProduct(raw.goal.productId),receipt=raw.goal.receipt&&m.receipts[raw.goal.receipt];
    if(raw.goal.productId&&(!product||product.storeId!==raw.goal.storeId))throw Error('Пошкоджена мета візиту ТРЦ');
    if(raw.goal.receipt&&(!receipt||receipt.product!==raw.goal.productId))throw Error('Пошкоджений оплачений візит ТРЦ');
    m.goal={layoutVersion:raw.goal.layoutVersion===2?2:1,storeId:raw.goal.storeId,at:raw.goal.at,productId:product?.id||null,receipt:receipt?raw.goal.receipt:null,purchased:!!receipt,used:!!receipt&&raw.goal.used===true};
  }
  return m;
}
export function mallStock(game,id){const product=mallProduct(id);if(!product)return 0;let count=0;for(const p of Object.values(game.jobCity?.profiles||{}))for(const r of Object.values(p.mall?.receipts||{}))if(r.product===id)count++;return product.stock-count;}
export function validateMallEconomy(game){
  const totals=new Map();
  for(const p of Object.values(game.jobCity?.profiles||{})){
    if(!p.mall&&!Object.keys(p.inventory||{}).some(mallProduct))continue;
    const m=normalizeMallProfile(p.mall),seq=new Set(),counts=new Map();
    for(const r of Object.values(m.receipts)){
      if(r.sequence>p.purchaseCount||seq.has(r.sequence))throw Error('Некоректна послідовність чеків ТРЦ');seq.add(r.sequence);
      counts.set(r.product,(counts.get(r.product)||0)+1);
      totals.set(r.product,(totals.get(r.product)||0)+1);
    }
    for(const item of MALL_PRODUCTS)if((counts.get(item.id)||0)-(m.used[item.id]||0)!==(p.inventory?.[item.id]||0))throw Error('Покупка ТРЦ не відповідає інвентарю');
  }
  for(const item of MALL_PRODUCTS)if((totals.get(item.id)||0)>item.stock)throw Error('Останній товар уже купили. Оновіть каталог.');
  return game;
}
export function buyMallProduct(game,id,productId,receipt,now=Date.now()){
  const p=game.jobCity?.profiles[id],item=mallProduct(productId);
  if(!p||!item||!game.unlocked.includes('autumn')||typeof receipt!=='string'||!/^[\w-]{8,80}$/.test(receipt)||!Number.isFinite(now)||now<0)throw Error('Покупка ТРЦ недоступна');
  const m=normalizeMallProfile(p.mall),prior=m.receipts[receipt];
  if(prior){if(prior.product!==productId)throw Error('Цей чек належить іншому товару');return game;}
  if(item.legacy)throw Error('У Ocean Ice Cream уже нове меню. Оберіть смак морозива.');
  const sequence=Number(receipt.match(/-(\d+)$/)?.[1]);
  if(sequence!==p.purchaseCount+1)throw Error('Оновіть гаманець котика перед покупкою');
  if(p.coins<item.price)throw Error('У котика недостатньо власних монеток');
  if(mallStock(game,productId)<=0)throw Error('Товар закінчився');
  if((p.inventory[productId]||0)>=(item.unique?1:30))throw Error('Цей товар уже є у котика');
  const n=clone(game),q=n.jobCity.profiles[id];
  q.mall=m;q.mall.receipts[receipt]={product:productId,sequence,price:item.price,at:now};
  q.mall.visited=[...new Set([...m.visited,item.storeId])];
  q.purchaseCount=sequence;q.coins-=item.price;q.spentTotal+=item.price;
  q.inventory[productId]=(q.inventory[productId]||0)+1;
  q.transactions=[...(q.transactions||[]),{id:receipt,kind:'purchase',item:productId,amount:-item.price,at:now}].slice(-12);
  if(q.mall.goal?.storeId===item.storeId){q.mall.goal={...q.mall.goal,productId,receipt,purchased:true,used:false};}
  q.status='joy';return n;
}
export function useMallProduct(game,id,productId){
  const p=game.jobCity?.profiles[id],item=mallProduct(productId);
  if(!p||!item||!(p.inventory[productId]>0))throw Error('Річ відсутня в інвентарі');
  const n=clone(game),q=n.jobCity.profiles[id];q.mall=normalizeMallProfile(q.mall);
  if(item.use==='wear')q.mall.equipped=productId;
  else if(['eat','cinema','arcade','bowling','spa','photo'].includes(item.use)){
    q.inventory[productId]--;if(!q.inventory[productId])delete q.inventory[productId];
    q.mall.used[productId]=(q.mall.used[productId]||0)+1;
    if(item.use==='eat'){
      const care=id==='chichi'?n.cat:n.care?.residents?.[id];
      if(care){care.hunger=Math.max(0,(care.hunger||0)-35);care.energy=Math.min(100,(care.energy||0)+8);}
    }
  }
  const needs=id==='chichi'?n.cat:n.care?.residents?.[id];
  if(needs&&['play','read','rest','home','spa'].includes(item.use)){
    needs.happiness=Math.min(100,(needs.happiness||0)+6);
    if(['rest','home','spa'].includes(item.use)&&id==='chichi')needs.energy=Math.min(100,(needs.energy||0)+10);
  }
  if(q.mall.goal?.purchased&&q.mall.goal.productId===productId)q.mall.goal.used=true;
  return n;
}
// The existing batch supplies the store intent. This only validates an
// affordable product within that store; it never creates another AI request.
export function mallChoice(game,id,storeId){
  const p=game.jobCity?.profiles[id];if(!p)return null;
  const choices=MALL_PRODUCTS.filter(x=>!x.legacy&&x.storeId===storeId&&x.price<=p.coins&&mallStock(game,x.id)>0&&(!x.unique||!p.inventory[x.id]))
    .sort((a,b)=>Number(!p.wishes?.includes(a.id))-Number(!p.wishes?.includes(b.id))||a.price-b.price);
  if(storeId==='mall-ice'&&choices.length&&!p.wishes?.includes(choices[0].id)){
    let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
    const visits=Object.values(p.mall?.receipts||{}).filter(r=>mallProduct(r.product)?.iceFlavor).length;
    return choices[(hash+visits)%choices.length];
  }
  return choices[0]||null;
}
