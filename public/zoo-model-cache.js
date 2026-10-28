import {ZOO_MODELS} from './zoo-model-manifest.js';
import {decodeZooTemplate} from './zoo-model-codec.js';
import {installZooAnimalTemplate} from './zoo-animals.js';
let pending;
// Download only the selected zoo. Sequential decoding yields to input; the
// ordinary cooperative sculpt remains the exact fallback for failed assets.
export function prepareZooAnimalTemplates(){
 if(typeof window==='undefined')return Promise.resolve(false);
 return pending||=(async()=>{let ok=true;for(const [species,url]of Object.entries(ZOO_MODELS)){
  try{const compressed=typeof DecompressionStream==='function',response=await fetch(compressed?url+'.gz':url);if(!response.ok)throw Error('Zoo asset unavailable');
   const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
   if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);if(!url.includes('-'+hash+'.bin'))throw Error('Corrupt zoo model');}
   installZooAnimalTemplate(decodeZooTemplate(buffer,species));} 
  catch{ok=false;}
  await new Promise(resolve=>setTimeout(resolve,0));
 }return ok;})();
}
