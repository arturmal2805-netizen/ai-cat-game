import {validateCryptoForecast,localCryptoForecast,cryptoClock,CRYPTO_RULES} from './public/crypto-trading.js';
const response=(body,status=200)=>({body,status});
export function validateCryptoRequest(raw){
  if(!raw||typeof raw.catId!=='string'||!/^[-\w]{1,90}$/.test(raw.catId)||
    typeof raw.attemptId!=='string'||!/^[-\w]{1,160}$/.test(raw.attemptId)||
    !Number.isFinite(raw.epoch)||raw.epoch<0)throw Error('Invalid trading attempt');
  return {catId:raw.catId,attemptId:raw.attemptId,epoch:raw.epoch};
}
function forecastAnswer(answer){
  let raw=answer?.response??answer;
  if(typeof raw==='string')raw=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  return validateCryptoForecast(raw);
}
export function cryptoForecastInput(profile){
  return {messages:[{role:'system',content:'Return one forecast for a fictional cat trading simulation, NOT real markets. Prices and money are fictional. JSON only: asset BTC or ETH, direction up or down, strength 0.01 to 0.12, confidence 0 to 1, reason a short Ukrainian explanation. The cat independently chooses LONG, SHORT or skipping; your forecast never guarantees profit. No prices, orders, exchange links or real financial advice.'},
    {role:'user',content:JSON.stringify({personality:profile.personality,skill:profile.skills?.crypto||1})}],
    max_tokens:200,temperature:.5,response_format:{type:'json_schema',json_schema:{name:'cat_crypto_forecast',strict:true,schema:{type:'object',additionalProperties:false,required:['asset','direction','strength','confidence','reason'],properties:{asset:{type:'string',enum:['BTC','ETH']},direction:{type:'string',enum:['up','down']},strength:{type:'number',minimum:.01,maximum:.12},confidence:{type:'number',minimum:0,maximum:1},reason:{type:'string',maxLength:180}}}}}};
}
// Each paid attempt is reserved in the same world's durable store BEFORE the
// provider call. Failed/lost responses cannot produce another inference call.
export class CryptoAIRequestLedger{
  constructor(storage,run,{clock=Date.now,timeout=100000}={}){this.storage=storage;this.run=run;this.clock=clock;this.timeout=timeout;this.inflight=new Map();}
  async forecast(input){
    const key=input.catId+':'+input.attemptId;
    if(this.inflight.has(key))return this.inflight.get(key);
    const pending=this.execute(input);this.inflight.set(key,pending);
    try{return await pending;}finally{this.inflight.delete(key);}
  }
  async execute(input){
    const slot='crypto-ai:'+input.catId,local=()=>response({attemptId:input.attemptId,forecast:localCryptoForecast(input.attemptId),source:'local'});
    const reservation=await this.storage.transaction(async t=>{
      const old=await t.get(slot);
      if(old?.attemptId===input.attemptId){
        if(old.result)return {cached:old.result};
        // A process restart after reserving is an uncertain provider outcome.
        // Finalize locally, never invoke the provider a second time.
        const cached=local();await t.put(slot,{...old,result:cached});return {cached};
      }
      const saved=await t.get('current'),state=saved?.game?.jobCity,p=state?.profiles[input.catId],attempt=p?.investments?.current,
        clock=cryptoClock(state,this.clock());
      if(!state||state.epoch!==input.epoch||p?.profession!=='crypto'||attempt?.id!==input.attemptId||attempt.status!=='waiting'||
        !Number.isSafeInteger(attempt.day)||attempt.day>clock.day||p.coins<CRYPTO_RULES.minCoins||
        p.investments.lastAttemptDay!==attempt.day||p.investments.nextAttemptDay!==attempt.day+14)
        return {cached:response({error:'Trading attempt not reserved in the saved world'},409)};
      if(old?.epoch===input.epoch&&attempt.day<old.day+14)return {cached:response({error:'Trading cycle already used'},409)};
      await t.put(slot,{epoch:input.epoch,attemptId:input.attemptId,day:attempt.day,reservedAt:this.clock(),result:null});
      return {profile:p};
    });
    if(reservation.cached)return reservation.cached;
    let result,timer;
    try{
      const answer=await Promise.race([this.run(cryptoForecastInput(reservation.profile),forecastAnswer),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Forecast timeout')),this.timeout);})]);
      result=response({attemptId:input.attemptId,forecast:forecastAnswer(answer),source:'ai'});
    }catch{result=local();}finally{clearTimeout(timer);}
    return this.storage.transaction(async t=>{
      const record=await t.get(slot);
      if(record?.attemptId!==input.attemptId)return local();
      if(record.result)return record.result;
      await t.put(slot,{...record,result});return result;
    });
  }
}
