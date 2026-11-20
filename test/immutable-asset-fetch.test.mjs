import test from 'node:test';import assert from 'node:assert/strict';import{fetchImmutableAsset}from'../public/immutable-asset-fetch.js';
test('only same-origin content-addressed art/models reuse stale HTTP entries; API/code/explicit controls stay native',async()=>{
 const doc=globalThis.document,fetch=globalThis.fetch,calls=[];globalThis.document={baseURI:'https://example.test/ai-cat-game/?v=abc'};globalThis.fetch=async(...args)=>{calls.push(args);return new Response('original bytes');};
 try{
  const signal=new AbortController().signal;
  for(const p of ['./art/ocean-rock/normal-dbcd0a950de5.png','./models/reefs/organic-reef-1b90309ff46a4537.bin.gz']){const r=await fetchImmutableAsset(p,{signal});assert.equal(await r.text(),'original bytes');assert.equal(calls.at(-1)[1].cache,'force-cache');assert.equal(calls.at(-1)[1].signal,signal);assert.equal(calls.at(-1)[0],p);}
  for(const p of ['/api/save','./dist/app.js?v=hash','./config.js','./art/normal.png','https://other.test/art/normal-dbcd0a950de5.png']){await fetchImmutableAsset(p,{signal});assert.equal(calls.at(-1)[1].cache,undefined);}
  await fetchImmutableAsset('./art/normal-dbcd0a950de5.png',{cache:'reload',signal});assert.equal(calls.at(-1)[1].cache,'reload');
  await fetchImmutableAsset('./art/normal-dbcd0a950de5.png',{method:'POST'});assert.equal(calls.at(-1)[1].cache,undefined);
 }finally{globalThis.fetch=fetch;if(doc===undefined)delete globalThis.document;else globalThis.document=doc;}
});
