import {messages,parseDecision,validateState} from './ai.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default {
 async fetch(request,env) {
  const path=new URL(request.url).pathname;
  if(path==='/api/status' && request.method==='GET') return json({configured:!!env.AI});
  if(path==='/api/decide' && request.method==='POST') {
   if(!env.AI) return json({error:'Cloudflare AI не подключён.'},503);
   if(Number(request.headers.get('content-length'))>2048) return json({error:'Слишком большой запрос'},413);
   const reader=request.body?.getReader();if(!reader)return json({error:'Нет состояния'},400);
   let size=0,chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return json({error:'Слишком большой запрос'},413);}chunks.push(value);}
   let state;try {const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}state=validateState(JSON.parse(new TextDecoder().decode(bytes)));}catch{return json({error:'Некорректное состояние котика'},400);}
   try {const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{messages:messages(state),max_tokens:150});return json(parseDecision(result));}
   catch{return json({error:'Cloudflare AI сейчас не отвечает. Повторите попытку.'},502);}
  }
  if(path.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }
};
