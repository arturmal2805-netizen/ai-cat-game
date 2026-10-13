import {writeFile} from 'node:fs/promises';
import {parseDecision} from '../ai.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw new Error('Missing Cloudflare deployment credentials');
const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/subdomain`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`Cannot discover Worker subdomain: HTTP ${response.status}`);
const data=await response.json();
const subdomain=data.result?.subdomain;
if(!data.success||!subdomain||!/^[a-z0-9-]+$/i.test(subdomain))throw new Error('Cloudflare workers.dev subdomain is not configured');
const apiBase=`https://chichi-cat-world.${subdomain}.workers.dev`;
let verified=false;
for(let attempt=0;attempt<3;attempt++) {
 try {
  const status=await fetch(`${apiBase}/api/status`,{signal:AbortSignal.timeout(20000)});
  if(!status.ok||!(await status.json()).configured)throw new Error('AI binding is unavailable');
  const decision=await fetch(`${apiBase}/api/decide`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://arturmal2805-netizen.github.io'},body:JSON.stringify({location:'home',hunger:30,energy:85}),signal:AbortSignal.timeout(30000)});
  if(!decision.ok){const failure=await decision.json().catch(()=>({}));throw new Error(`AI decision failed: HTTP ${decision.status}; ${failure.code||'UNKNOWN'}; ${failure.error||'No details'}`);}
  if(decision.headers.get('Access-Control-Allow-Origin')!=='https://arturmal2805-netizen.github.io')throw new Error('GitHub Pages CORS is missing');
  parseDecision(JSON.stringify(await decision.json()));
  verified=true;break;
 } catch(error) {if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,5000));}
}
if(!verified)throw new Error('AI was not verified');
await writeFile('public/config.js',`export const apiBase = ${JSON.stringify(apiBase)};\n`);
console.log(`Cloudflare AI verified. Pages will connect to ${apiBase}`);
