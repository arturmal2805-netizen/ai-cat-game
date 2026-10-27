import {JOB_CLOCK_ORIGIN,JOB_START,JOB_END,JOB_MINUTE_MS,JOB_DAY_MINUTES} from './jobcity-data.js';

// Fictional prices and personal cat coins only. No exchange or market feed.
export const CRYPTO_RULES=Object.freeze({intervalDays:7,durationMs:45000,minCoins:30,maxLeverage:3,feeRate:.002,pathPoints:65,
  moonshotChance:.05,moonshotMin:8,moonshotMax:25});
const hash=s=>[...String(s)].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,7);
// Independent, deterministic draws per durable attempt, not a per-tick reroll
// or another AI request. Avalanche the ID hash to avoid adjacent-ID patterns.
const eventDraw=id=>{let h=hash(id);h=Math.imul(h^(h>>>16),0x21f0aaad);h=Math.imul(h^(h>>>15),0x735a2d97);return ((h^(h>>>15))>>>0)/4294967296;};
export function cryptoMarketEvent(attemptId){
  if(eventDraw(attemptId+':moonshot-v1')>=CRYPTO_RULES.moonshotChance)return null;
  return {kind:'moonshot',multiplier:CRYPTO_RULES.moonshotMin+Math.floor(eventDraw(attemptId+':moonshot-size-v1')*(CRYPTO_RULES.moonshotMax-CRYPTO_RULES.moonshotMin+1)),
    startsAt:.2+eventDraw(attemptId+':moonshot-time-v1')*.2};
}
const clone=v=>structuredClone(v);
export const cryptoClock=(state,now=Date.now())=>{
  const absolute=JOB_CLOCK_ORIGIN+Math.max(0,(now-(state?.epoch??now))/JOB_MINUTE_MS);
  return {day:Math.floor(absolute/JOB_DAY_MINUTES),minute:absolute%JOB_DAY_MINUTES};
};
export function traderRisk(profile){const base={'Спокійний':.25,'Товариський':.5,'Допитливий':.65,'Винахідливий':.8}[profile.personality]??.5;return Math.max(.1,Math.min(.9,base+(hash(profile.id+'risk')%201-100)/1000));}
export function validateCryptoForecast(value){
  if(!value||!['BTC','ETH'].includes(value.asset)||!['up','down'].includes(value.direction)||
    !Number.isFinite(value.strength)||value.strength<.01||value.strength>.12||
    !Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||
    typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>180)throw Error('Invalid crypto forecast');
  return {asset:value.asset,direction:value.direction,strength:value.strength,confidence:value.confidence,reason:value.reason.trim()};
}
export function localCryptoForecast(id){
  return {asset:hash(id)%2?'BTC':'ETH',direction:hash(id+'direction')%2?'up':'down',
    strength:.02+(hash(id+'strength')%70)/1000,confidence:.45+(hash(id+'confidence')%40)/100,
    reason:'Місцевий ігровий прогноз: ринок може рухатися в обидва боки.'};
}
function newInvestments(profile){return {version:1,lastAttemptDay:-1,nextAttemptDay:Math.max(0,profile.professionSinceDay||0)+CRYPTO_RULES.intervalDays,totalPNL:0,current:null,history:[]};}
const terminal=t=>['closed','liquidated','skipped'].includes(t?.status);
function validTrade(t){
  if(!t||typeof t.id!=='string'||t.id.length>160||!Number.isSafeInteger(t.day)||t.day<0||
    !['waiting','open','closed','liquidated','skipped'].includes(t.status)||!Number.isFinite(t.at)||t.at<0)return false;
  if(t.status==='waiting'||t.status==='skipped')return true;
  if(t.marketEvent!=null&&(!t.marketEvent||t.marketEvent.kind!=='moonshot'||
    !Number.isInteger(t.marketEvent.multiplier)||t.marketEvent.multiplier<CRYPTO_RULES.moonshotMin||t.marketEvent.multiplier>CRYPTO_RULES.moonshotMax||
    !Number.isFinite(t.marketEvent.startsAt)||t.marketEvent.startsAt<.2||t.marketEvent.startsAt>.4))return false;
  return ['BTC','ETH'].includes(t.asset)&&['LONG','SHORT'].includes(t.action)&&
    [t.margin,t.leverage,t.entryPrice,t.startedAt,t.endAt,t.durationMs,t.fee].every(Number.isFinite)&&
    Number.isSafeInteger(t.margin)&&t.margin>0&&Number.isSafeInteger(t.fee)&&t.fee>=0&&t.fee<=t.margin&&Number.isInteger(t.leverage)&&t.leverage>=1&&t.leverage<=CRYPTO_RULES.maxLeverage&&t.entryPrice>0&&
    t.durationMs>=10000&&t.durationMs<=60000&&t.endAt>=t.startedAt&&t.endAt<=t.startedAt+t.durationMs&&
    Array.isArray(t.path)&&t.path.length===65&&t.path.every(p=>Number.isFinite(p)&&p>0)&&
    (t.status==='open'||(Number.isSafeInteger(t.pnl)&&t.pnl>=-t.margin&&Number.isFinite(t.exitPrice)&&t.exitPrice>0&&t.closedAt===t.endAt));
}
export function investmentsSnapshotValid(raw){
  if(raw == null) return true;
  if(!raw||raw.version!==1||!Number.isSafeInteger(raw.lastAttemptDay)||raw.lastAttemptDay< -1||
    !Number.isSafeInteger(raw.nextAttemptDay)||raw.nextAttemptDay<0||!Number.isSafeInteger(raw.totalPNL)||
    (raw.current&&!validTrade(raw.current))||!Array.isArray(raw.history))return false;
  const seen=new Set();
  if(raw.history.some(t=>!validTrade(t)||!terminal(t)||seen.has(t.id)||(seen.add(t.id),false)))return false;
  return true;
}
export function cryptoSnapshotValid(state){
  return Object.values(state?.profiles || {}).every(p => investmentsSnapshotValid(p?.investments));
}
export function normalizeInvestments(raw){
  return raw != null && investmentsSnapshotValid(raw) ? clone(raw) : null;
}
function archive(investments,t){
  if(!investments.history.some(h=>h.id===t.id))investments.history.push(clone(t));
}
function skipAttempt(investments,t,reason){t.status='skipped';t.action='skip';t.reason=reason;t.pnl=0;archive(investments,t);}
// Reserve and durably save this result BEFORE networking. Skips also consume
// the individual seven-day cycle, so one-second ticks never poll the AI again.
export function reserveCryptoAttempt(game,now=Date.now()){
  if(!game.jobCity||!game.unlocked.includes('jobcity'))return {game,request:null};
  const clock=cryptoClock(game.jobCity,now);
  if(clock.minute<JOB_START||clock.minute>=JOB_END)return {game,request:null};
  for(const p of Object.values(game.jobCity.profiles)){
    if(p.profession!=='crypto'||p.investments?.current?.status==='waiting'||p.investments?.current?.status==='open')continue;
    const old=p.investments||newInvestments(p);
    if(clock.day<old.nextAttemptDay)continue;
    const next=clone(game),n=next.jobCity.profiles[p.id],s=n.investments||=newInvestments(n),
      id=`crypto-${game.jobCity.epoch}-${p.id}-${clock.day}`,t={id,day:clock.day,at:now,status:'waiting',action:'wait',forecast:null};
    s.lastAttemptDay=clock.day;s.nextAttemptDay=clock.day+CRYPTO_RULES.intervalDays;s.current=t;
    if(n.coins<CRYPTO_RULES.minCoins)skipAttempt(s,t,'Поки накопичує власні монетки.');
    else if((hash(id+'willing')%1000)/1000>.35+traderRisk(p)*.6)skipAttempt(s,t,'Цього циклу обрав спокій і пропустив торгівлю.');
    return {game:next,request:t.status==='waiting'?{catId:p.id,attemptId:id,epoch:game.jobCity.epoch}:null};
  }
  return {game,request:null};
}
export function pendingCryptoAttempt(game){
  const p=Object.values(game.jobCity?.profiles||{}).find(p=>p.profession==='crypto'&&p.investments?.current?.status==='waiting');
  return p?{catId:p.id,attemptId:p.investments.current.id,epoch:game.jobCity.epoch}:null;
}
function simulatedPath(t,forecast){
  const id=t.id,values=[],direction=forecast.direction==='up'?1:-1,
    correct=hash(id+'outcome')%100>=40,
    shock=hash(id+'shock')%100<5,
    drift=shock?(hash(id+'shock-side')%2?1:-1)*(.38+(hash(id+'tail')%200)/1000):
      direction*(correct?1:-1)*forecast.strength*(.7+(hash(id+'range')%600)/1000),
    wave=.012+(hash(id+'wave')%24)/1000,phase=(hash(id+'phase')%628)/100;
  for(let i=0;i<CRYPTO_RULES.pathPoints;i++){
    const u=i/(CRYPTO_RULES.pathPoints-1),noise=Math.sin(u*Math.PI)*wave*
      (Math.sin(u*23+phase)+.45*Math.sin(u*51+phase*.7));
    if(t.marketEvent){
      const ramp=Math.max(0,(u-t.marketEvent.startsAt)/(1-t.marketEvent.startsAt)),
        surge=ramp*ramp*(3-2*ramp),
        // A visible rising curve with modest waves, not an instant payout or
        // one giant discontinuity. Ordinary pre-surge risk remains intact.
        multiplier=1+drift*u*(1-surge)+noise+(t.marketEvent.multiplier-1)*surge;
      values.push(t.entryPrice*Math.max(.05,multiplier));
    }else values.push(t.entryPrice*Math.max(.05,1+drift*u+noise));
  }
  values[0]=t.entryPrice;return values;
}
export function priceAt(t,now){
  if(terminal(t))return t.exitPrice||t.entryPrice||0;
  const u=Math.max(0,Math.min(1,(now-t.startedAt)/t.durationMs))*(t.path.length-1),i=Math.floor(u);
  return t.path[i]+((t.path[Math.min(i+1,t.path.length-1)]-t.path[i])*(u-i));
}
export function positionValue(t,now=Date.now()){
  if(!t||!['open','closed','liquidated'].includes(t.status))return null;
  const price=priceAt(t,Math.min(now,t.endAt)),gross=Math.round(t.margin*t.leverage*((price-t.entryPrice)/t.entryPrice)*(t.action==='LONG'?1:-1)),
    pnl=terminal(t)?t.pnl:Math.max(-t.margin,gross-t.fee);
  return {price,pnl,fee:t.fee,returned:Math.max(0,t.margin+pnl),progress:Math.max(0,Math.min(1,(now-t.startedAt)/t.durationMs))};
}
export function applyCryptoForecast(game,request,value,source='ai',now=Date.now(),durationMs=CRYPTO_RULES.durationMs){
  const p=game.jobCity?.profiles[request.catId],old=p?.investments?.current;
  if(!p||game.jobCity.epoch!==request.epoch||old?.id!==request.attemptId||old.status!=='waiting')return game;
  const next=clone(game),n=next.jobCity.profiles[p.id],s=n.investments,t=s.current;
  let forecast;try{forecast=validateCryptoForecast(value);}catch{forecast=localCryptoForecast(t.id);source='local';}
  t.forecast=forecast;t.source=source==='ai'?'ai':'local';
  if(n.profession!=='crypto'||n.coins<CRYPTO_RULES.minCoins){skipAttempt(s,t,'Угоду пропущено: професія або баланс змінилися.');return next;}
  const risk=traderRisk(n);
  if(forecast.confidence<.3+(1-risk)*.3){skipAttempt(s,t,'Котик вважає прогноз ненадійним і береже монетки.');return next;}
  t.status='open';t.asset=forecast.asset;t.action=forecast.direction==='up'?'LONG':'SHORT';
  t.margin=Math.min(n.coins,Math.max(10,Math.floor(n.coins*(.04+risk*.08))));t.leverage=Math.min(3,1+Math.floor(risk*3));
  t.entryPrice=(t.asset==='BTC'?42000:2400)*(.9+(hash(t.id+'entry')%2000)/10000);
  t.startedAt=now;t.durationMs=Number.isFinite(durationMs)?Math.max(10000,Math.min(60000,durationMs)):CRYPTO_RULES.durationMs;t.endAt=now+t.durationMs;
  const marketEvent=cryptoMarketEvent(t.id);if(marketEvent)t.marketEvent=marketEvent;
  t.fee=Math.min(t.margin,Math.max(1,Math.ceil(t.margin*t.leverage*CRYPTO_RULES.feeRate)));t.path=simulatedPath(t,forecast);
  // Locate the first margin wipeout on the persisted, piecewise-linear path.
  const sign=t.action==='LONG'?1:-1,equity=price=>t.margin+t.margin*t.leverage*(price/t.entryPrice-1)*sign-t.fee;
  for(let i=1;i<t.path.length;i++)if(equity(t.path[i])<=0){
    const a=equity(t.path[i-1]),b=equity(t.path[i]),fraction=a/(a-b);
    t.endAt=now+((i-1+fraction)/(t.path.length-1))*t.durationMs;t.liquidation=true;break;
  }
  n.coins-=t.margin;
  n.transactions=[...n.transactions,{id:t.id+'-margin',kind:'crypto-margin',amount:-t.margin,at:now}].slice(-12);
  return next;
}
// Derive prices locally between durable events. Only settlement changes money;
// reloading or revisiting an already settled position can never pay it twice.
export function advanceCryptoTrading(game,now=Date.now()){
  let next=game;
  for(const p of Object.values(game.jobCity?.profiles||{})){
    const t=p.investments?.current;
    if(t?.status==='waiting'&&p.profession!=='crypto'){
      if(next===game)next=clone(game);const s=next.jobCity.profiles[p.id].investments;
      skipAttempt(s,s.current,'Угоду пропущено після зміни професії.');continue;
    }
    if(t?.status!=='open'||now<t.endAt)continue;
    if(next===game)next=clone(game);
    const n=next.jobCity.profiles[p.id],s=n.investments,v=s.current,result=positionValue(v,v.endAt);
    v.exitPrice=result.price;v.pnl=v.liquidation?-v.margin:result.pnl;v.closedAt=v.endAt;
    v.status=v.liquidation?'liquidated':'closed';
    n.coins+=Math.max(0,v.margin+v.pnl);s.totalPNL+=v.pnl;
    if(v.pnl>=0)n.earnedTotal+=v.pnl;else n.spentTotal-=v.pnl;
    n.transactions=[...n.transactions,{id:v.id+'-close',kind:'crypto-close',amount:Math.max(0,v.margin+v.pnl),pnl:v.pnl,at:v.closedAt}].slice(-12);
    archive(s,v);
  }
  return next;
}
