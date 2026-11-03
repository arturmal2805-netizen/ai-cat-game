import * as T from 'three';
import {SHOWCASE_WATER_PROBES} from './showcase-probe-assets.js';
import {waterEnvironmentTexture} from './water-environment.js';
const pending=new Map(),textures=new Map();
// These are offline captures of the original static mini-biome. Runtime keeps
// the SAME single environment lookup: no cube camera/target or scene copy.
export function prepareShowcaseWaterProbe(id){
 const url=SHOWCASE_WATER_PROBES[id];if(!url||typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 if(pending.has(id))return pending.get(id);
 const ready=(async()=>{try{
  const r=await fetch(url,typeof globalThis.AbortSignal?.timeout==='function'?{signal:AbortSignal.timeout(8000)}:{});if(!r.ok)throw Error('Reflection unavailable');
  const bitmap=await createImageBitmap(await r.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'}),t=new T.Texture(bitmap);
  t.name='Baked original water-biome reflection '+id;t.flipY=false;t.colorSpace=T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.userData.sharedScenery=true;t.needsUpdate=true;textures.set(id,t);return true;
 }catch{return false;}})();pending.set(id,ready);return ready;
}
export const showcaseWaterProbe=id=>textures.get(id)||waterEnvironmentTexture();
