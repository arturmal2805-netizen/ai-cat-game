// Explicit one-shot verification only. Never log secrets or retry inference.
const key=process.env.BACKUP_AI_API_KEY?.trim();
if(!key)throw Error('GitHub secret BACKUP_AI_API_KEY is missing');
const headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
const metadata=await fetch('https://openrouter.ai/api/v1/key',{headers,signal:AbortSignal.timeout(15000)});
if(!metadata.ok)throw Error('OpenRouter key check: HTTP '+metadata.status);
const {data}=await metadata.json();
console.log('OpenRouter key accepted: '+JSON.stringify({isFreeTier:data?.is_free_tier,creditLimit:data?.limit,creditLimitRemaining:data?.limit_remaining,dailyUsageUSD:data?.usage_daily}));
const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers,body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content:'Reply with exactly this JSON and no other text: {"ok":true}'}],max_tokens:256,temperature:0,response_format:{type:'json_object'},provider:{require_parameters:true}}),signal:AbortSignal.timeout(65000)});
if(!response.ok)throw Error('OpenRouter REAL inference: HTTP '+response.status+(response.status===402?' (balance/credit requirement)':response.status===429?' (rate limit)':response.status===401?' (invalid API key)':''));
const result=await response.json();
if(result.error)throw Error('OpenRouter REAL inference returned provider error '+String(result.error.code||'unknown'));
let content=result?.choices?.[0]?.message?.content;
if(typeof content!=='string'||!content.trim())throw Error('OpenRouter REAL inference returned no usable text');
content=content.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
if(JSON.parse(content).ok!==true)throw Error('OpenRouter REAL inference failed the JSON check');
console.log('REAL_OPENROUTER_INFERENCE_PASSED '+JSON.stringify({model:result.model,provider:result.provider||null,inputTokens:result.usage?.prompt_tokens,outputTokens:result.usage?.completion_tokens,costUSD:result.usage?.cost??null,freeRoute:true}));
