import * as T from 'three';
import {MOSA_WATER_PROBE} from './mosasaur-water-probe-assets.js';
import {waterEnvironmentTexture} from './water-environment.js';
let texture=null,request;
export const mosaWaterReflection=()=>({texture:texture||waterEnvironmentTexture(),gain:texture?4:1});
export function prepareMosaWaterReflection(){
 if(typeof window==='undefined'||!MOSA_WATER_PROBE||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return request??=(async()=>{let bitmap;try{
  const response=await fetch(MOSA_WATER_PROBE);if(!response.ok)throw Error('Coast reflection unavailable');bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  texture=new T.Texture(bitmap);texture.name='Actual Mosasaur tropical coast · linear radiance / 4';texture.flipY=false;texture.colorSpace=T.NoColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.userData.sharedScenery=true;texture.needsUpdate=true;return true;
 }catch{bitmap?.close?.();return false;}})();
}
