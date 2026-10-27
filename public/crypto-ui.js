import {positionValue,traderRisk,CRYPTO_RULES} from './crypto-trading.js';
const money=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(n||0),signed=n=>(n>=0?'+':'−')+money(Math.abs(n));
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
const status={waiting:'Очікує прогноз',open:'Відкрита',closed:'Закрита',liquidated:'Ліквідована',skipped:'Пропуск'};
const surgeVisible=(t,now)=>t?.marketEvent?.kind==='moonshot'&&
  Math.min(now,t.endAt)>=t.startedAt+t.durationMs*t.marketEvent.startsAt;
export function createInvestmentsPanel(parent,{labelDay=d=>'День '+(d+1)}={}){
 let key='',count=10,live=null;
 function update(profile,day,now=Date.now()){
  const s=profile.investments,t=s?.current,next=s?.nextAttemptDay??Math.max(0,profile.professionSinceDay||0)+CRYPTO_RULES.intervalDays,
    currentKey=JSON.stringify([profile.id,profile.profession,s?.totalPNL,t?.id,t?.status,s?.history.length,count,day,next]);
  if(currentKey!==key){
   key=currentKey;parent.replaceChildren(node('h3','Інвестиції'),node('p','Лише ігрові ціни та власні котячі монетки.','dialog-copy'));
   const total=node('p',`Загальний PNL: ${signed(s?.totalPNL||0)} 🐾`,'crypto-total '+((s?.totalPNL||0)>=0?'crypto-profit':'crypto-loss'));
   parent.append(total,node('p',profile.profession==='crypto'?`Ризик котика: ${Math.round(traderRisk(profile)*100)}% · наступна спроба ${labelDay(next)}${next>day?' · ще '+(next-day)+' ігрових дн.':''}`:'Торгувати можуть лише офіційні працівники криптоофісу. Попередня історія залишається тут.'));
   live=null;
   if(t){
    const card=node('article',undefined,'crypto-position');
    card.append(node('h4',`${t.asset||t.forecast?.asset||'BTC / ETH'} · ${t.action==='skip'?'Пропуск':t.action==='wait'?'Очікує рішення':t.action} · ${status[t.status]}`));
    if(t.forecast)card.append(node('p',`${t.source==='ai'?'Прогноз AI':'Місцевий прогноз'}: ${t.forecast.direction==='up'?'зростання':'падіння'} · ${Math.round(t.forecast.confidence*100)}% впевненості. ${t.forecast.reason}`));
    if(t.reason)card.append(node('p',t.reason));
    if(t.margin){
     const details=node('dl',undefined,'crypto-details');
     for(const [title,value] of [['Маржа',money(t.margin)+' 🐾'],['Плече',t.leverage+'×'],['Вхід',money(t.entryPrice)],['Вихід',t.exitPrice?money(t.exitPrice):'—'],['Комісія',money(t.fee)+' 🐾']])details.append(node('dt',title),node('dd',value));
     card.append(details);
     live={price:node('p'),pnl:node('p'),event:node('p',undefined,'crypto-profit'),progress:document.createElement('progress')};
     live.progress.max=1;live.progress.setAttribute('aria-label','Прогрес локальної симуляції');
     card.append(live.event,live.price,live.pnl,live.progress);
    }
    parent.append(card);
   }else parent.append(node('p',`Котик ще не торгував. Рішення переглядається раз на ${CRYPTO_RULES.intervalDays} ігрових днів.`));
   parent.append(node('h4','Історія угод'));
   for(const h of [...(s?.history||[])].reverse().slice(0,count)){
    const item=document.createElement('details');item.className='crypto-history';
    item.append(node('summary',`${labelDay(h.day)} · ${h.asset||h.forecast?.asset||'—'} · ${h.action==='skip'?'Пропуск':h.action} · ${status[h.status]} · ${signed(h.pnl||0)} 🐾`));
    if(h.margin)item.append(node('p',`Вхід ${money(h.entryPrice)} → вихід ${money(h.exitPrice)} · маржа ${money(h.margin)} · ${h.leverage}× · комісія ${money(h.fee)} 🐾`));
    if(surgeVisible(h,h.endAt))item.append(node('p',`🚀 Рідкісний зліт ${h.asset} · ціна на виході ${money(h.exitPrice/h.entryPrice)}×`,'crypto-profit'));
    if(h.forecast)item.append(node('p',h.forecast.reason));if(h.reason)item.append(node('p',h.reason));parent.append(item);
   }
   if(s?.history.length>count){const more=node('button','Показати ще','small-button');more.onclick=()=>{count+=10;key='';update(profile,day);};parent.append(more);}
  }
  if(live){const value=positionValue(t,now);live.event.hidden=!surgeVisible(t,now);live.event.textContent=live.event.hidden?'':`🚀 Рідкісний зліт ${t.asset} · ціна ${money(value.price/t.entryPrice)}×`;live.price.textContent='Ігрова ціна: '+money(value.price);live.pnl.textContent=(t.status==='open'?'Поточний PNL: ':'Результат: ')+signed(value.pnl)+' 🐾';live.pnl.className=value.pnl>=0?'crypto-profit':'crypto-loss';live.progress.value=t.status==='open'?value.progress:1;}
 }
 return {update};
}
