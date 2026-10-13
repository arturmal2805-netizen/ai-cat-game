import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {messages,parseDecision,validateState} from './ai.mjs';
const routes = {'/config.js':['public/config.js','text/javascript; charset=utf-8'],'/':['public/index.html','text/html; charset=utf-8'],'/app.js':['public/app.js','text/javascript; charset=utf-8'],'/style.css':['public/style.css','text/css; charset=utf-8']};
const token=process.env.CLOUDFLARE_API_TOKEN, account=process.env.CLOUDFLARE_ACCOUNT_ID;
let busy=false, last=0;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
http.createServer(async(req,res)=>{
 try {
  if(req.url==='/api/status' && req.method==='GET') return json(res,200,{configured:!!(token&&account)});
  if(req.url==='/api/decide' && req.method==='POST') {
   if(!token||!account) return json(res,503,{error:'Cloudflare AI не подключён. Укажите серверные CLOUDFLARE_API_TOKEN и CLOUDFLARE_ACCOUNT_ID.'});
   if(busy || Date.now()-last<4000) return json(res,429,{error:'Чичи ещё думает. Попробуйте чуть позже.'});
   let body=''; for await (const chunk of req) {body+=chunk; if(body.length>2048) return json(res,413,{error:'Слишком большой запрос'});}
   let state; try {state=validateState(JSON.parse(body));} catch {return json(res,400,{error:'Некорректное состояние котика'});}
   busy=true; last=Date.now();
   try {
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages:messages(state),max_tokens:256,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error(`Cloudflare HTTP ${response.status}`);
    const result=await response.json(); if(!result.success) throw new Error('Cloudflare rejected request');
    return json(res,200,parseDecision(result.result));
   } finally {busy=false;}
  }
  if(req.method==='GET' && routes[req.url]) {const [file,type]=routes[req.url];res.writeHead(200,{'Content-Type':type});return res.end(await readFile(new URL(file,import.meta.url)));}
  json(res,404,{error:'Not found'});
 } catch(error) {console.error(error.message);json(res,502,{error:'Cloudflare AI сейчас не отвечает. Повторите попытку.'});}
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Chichi server started'));
