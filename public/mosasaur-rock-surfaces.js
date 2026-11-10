import * as T from 'three';
import {showcaseSurfaceSet} from './showcase-surface-details.js';
import {MOSA_ROCK_SURFACES} from './mosasaur-rock-surface-assets.js';
let prepared=null,request;
export const mosaRockSurface=()=>prepared||{...showcaseSurfaceSet('stone'),reef:showcaseSurfaceSet('moss').color,sand:showcaseSurfaceSet('sand').color};
export function prepareMosaRockSurfaces(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return request??=(async()=>{const created=[];try{
  const maps={},queue=Object.entries(MOSA_ROCK_SURFACES);
  const results=await Promise.allSettled(Array.from({length:3},async()=>{while(queue.length){const [role,url]=queue.shift();
   const response=await fetch(url);if(!response.ok)throw Error('Ocean stone unavailable');const image=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'}),t=new T.Texture(image);t.name='Shared eroded ocean rock '+role;t.flipY=false;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(role==='coralNormal')t.repeat.set(4,4);t.colorSpace=role.endsWith('Normal')||role==='normal'?T.NoColorSpace:T.SRGBColorSpace;t.userData.sharedScenery=true;t.needsUpdate=true;maps[role]=t;created.push(t);
  }}));if(results.some(r=>r.status==='rejected'))throw Error('Incomplete ocean surface set');prepared=maps;return true;
 }catch{for(const t of created){t.dispose();t.image?.close?.();}return false;}})();
}
