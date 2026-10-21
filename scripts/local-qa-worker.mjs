// Private local SQLite and an immutable build snapshot; never a player world.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';import {spawn}from'node:child_process';
export async function localQAWorker(root){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chichi-private-qa-')),socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 fs.copyFileSync(path.join(root,'.generated/worker.mjs'),path.join(temp,'worker.mjs'));fs.cpSync(path.join(root,'public'),path.join(temp,'public'),{recursive:true});
 const config=path.join(temp,'wrangler.json');fs.writeFileSync(config,JSON.stringify({name:'chichi-private-qa',main:path.join(temp,'worker.mjs'),compatibility_date:'2026-10-13',assets:{directory:path.join(temp,'public'),binding:'ASSETS',run_worker_first:['/api/*']},durable_objects:{bindings:[{name:'SAVE_VAULT',class_name:'SaveVault'}]},migrations:[{tag:'save-vault-v1',new_sqlite_classes:['SaveVault']}],vars:{GAME_RELEASE:'development'}}));
 const env={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete env[key];env.NO_PROXY='127.0.0.1,localhost';env.CLOUDFLARE_SEND_METRICS='false';env.WRANGLER_LOG_PATH=path.join(temp,'wrangler.log');
 const log=fs.openSync(path.join(temp,'worker.log'),'w'),child=spawn(path.join(root,'node_modules/.bin/wrangler'),['dev','--local','--config',config,'--persist-to',path.join(temp,'sqlite'),'--port',String(port),'--inspector-port','0'],{cwd:root,detached:true,env,stdio:['ignore',log,log]});
 const stop=()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}fs.closeSync(log);};const base='http://127.0.0.1:'+port;
 for(let i=0;i<150;i++){try{if((await fetch(base+'/api/status')).ok)return{base,stop,temp};}catch{}await new Promise(r=>setTimeout(r,200));}stop();throw Error('Local QA startup failed: '+temp);
}
