import {prepareZooCoat} from './zoo-coat-atlas.js';
import {prepareGorillaFace} from './zoo-gorilla-face.js';
import {ZOO_MODELS} from './zoo-model-manifest.js';
import {decodeZooTemplate} from './zoo-model-codec.js';
import {installZooAnimalTemplate} from './zoo-animals.js';
const requests=new Map();
// Download only the selected zoo. Sequential decoding yields to input; the
// ordinary cooperative sculpt remains the exact fallback for failed assets.
export function prepareZooAnimalTemplates(selectedSpecies=null){
 if(typeof window==='undefined')return Promise.resolve(false);
 return (async()=>{const coat=Promise.all([prepareZooCoat(),...(!selectedSpecies||selectedSpecies==='gorilla'?[prepareGorillaFace()]:[])]);let ok=true;for(const [species,url]of Object.entries(ZOO_MODELS)){if(selectedSpecies&&species!==selectedSpecies)continue;
 if(!requests.has(species))requests.set(species,(async()=>{
  try{const compressed=typeof DecompressionStream==='function',response=await fetch(compressed?url+'.gz':url);if(!response.ok)throw Error('Zoo asset unavailable');
   const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
   if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);if(!url.includes('-'+hash+'.bin'))throw Error('Corrupt zoo model');}
   installZooAnimalTemplate(decodeZooTemplate(buffer,species));} 
  catch{return false;}return true;})());
 if(!await requests.get(species))ok=false;
  await new Promise(resolve=>setTimeout(resolve,0));
 }await coat;return ok;})();
}
