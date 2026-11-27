import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';
test('actual workerd starts with Warehouse catalogue but no renderer encoder initialization',async()=>{
 const script=await readFile(new URL('../.generated/worker.mjs',import.meta.url),'utf8');assert(!script.includes('MeshoptEncoder'),'renderer must stay outside the Worker startup graph');
 const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',port:0,modules:true,script,compatibilityDate:'2026-10-13',bindings:{GAME_RELEASE:'private-warehouse-check'},durableObjects:{SAVE_VAULT:{className:'SaveVault',useSQLite:true}},log:new Log(LogLevel.ERROR)}));
 try{const base=await mf.ready,response=await fetch(new URL('/api/status',base));assert.equal(response.status,200);const status=await response.json();assert(status);const save=await fetch(new URL('/api/save',base),{headers:{'X-Chichi-Save-Token':'c'.repeat(64)}});assert.equal(save.status,200);assert.equal((await save.json()).game,null);}finally{await mf.dispose();}
});
