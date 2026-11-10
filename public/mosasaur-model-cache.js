import {MOSA_MODEL_URL} from './mosasaur-model-manifest.js';
import {decodeMosasaurModels} from './mosasaur-model-codec.js';
import {installMosasaurGeometry} from './mosasaur-sculpt.js';
let request;
export function prepareMosasaurModels(){
 if(typeof window==='undefined'||!MOSA_MODEL_URL)return Promise.resolve(false);
 return request??=(async()=>{try{
  const compressed=typeof DecompressionStream==='function',response=await fetch(compressed?MOSA_MODEL_URL+'.gz':MOSA_MODEL_URL);if(!response.ok)throw Error('Marine model unavailable');
  const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
  if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);if(!MOSA_MODEL_URL.includes('-'+hash+'.bin'))throw Error('Corrupt marine model');}
  for(const [kind,g]of Object.entries(decodeMosasaurModels(buffer)))installMosasaurGeometry(kind,g);return true;
 }catch{return false;}})();
}
